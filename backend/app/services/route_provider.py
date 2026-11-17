"""Provider boundary: no business identifiers or credentials in results/errors."""
import json
import math
import socket
from dataclasses import dataclass, field
from datetime import datetime, UTC
from decimal import Decimal, ROUND_HALF_UP
from typing import Protocol
from urllib import request, error
from app.core.config import get_settings

ORS_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/json'
ATTRIBUTION = '© openrouteservice by HeiGIT | Data from OpenStreetMap'
LICENSE = 'https://creativecommons.org/licenses/by-sa/4.0/'
MAX_BYTES = 2_000_000
MESSAGES = {
    'SUCCESS':'Driving estimate calculated. Review warnings before confirming.',
    'NOT_CONFIGURED':'Routing is not configured. Set the backend ORS_API_KEY locally.',
    'AUTH_FAILED':'Routing provider rejected its credentials. Ask an administrator to check configuration.',
    'QUOTA_EXCEEDED':'Routing request budget exhausted. Wait before explicitly retrying.',
    'INVALID_ENDPOINTS':'The provider rejected these coordinates. Verify the endpoints.',
    'NO_ROUTE':'No driving route was found. Verify road access and the endpoint pins.',
    'UNAVAILABLE':'Routing provider is unavailable. Inventory is unchanged; retry explicitly later.',
    'INVALID_RESPONSE':'Routing provider returned an invalid response. No estimate was accepted.'}


@dataclass
class RouteResult:
    status: str
    provider: str = 'openrouteservice'
    distance_meters: Decimal | None = None
    duration_seconds: Decimal | None = None
    warnings: list = field(default_factory=list)
    geometry: list | None = None
    provider_timestamp: datetime | None = None
    attempted: bool = False
    retry_seconds: int | None = None


class RoutingProvider(Protocol):
    configured: bool
    def calculate_route(self, origin, destination, profile='driving-car') -> RouteResult: ...


def number(value, maximum):
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)) or not math.isfinite(value) or not 0 <= value <= maximum:
        raise ValueError('Invalid metric')
    return Decimal(str(value)).quantize(Decimal('.001'), rounding=ROUND_HALF_UP)


def decode_geometry(encoded):
    if not isinstance(encoded, str) or not encoded or len(encoded) > 500000:
        raise ValueError('Invalid geometry')
    position, lat, lon, points = 0, 0, 0, []
    while position < len(encoded):
        deltas = []
        for _ in range(2):
            result, shift = 0, 0
            while True:
                if position >= len(encoded) or shift > 30:
                    raise ValueError('Invalid polyline')
                byte = ord(encoded[position]) - 63
                position += 1
                if not 0 <= byte <= 63:
                    raise ValueError('Invalid polyline')
                result |= (byte & 31) << shift
                shift += 5
                if byte < 32:
                    break
            deltas.append(~(result >> 1) if result & 1 else result >> 1)
        lat += deltas[0]; lon += deltas[1]
        if not -9000000 <= lat <= 9000000 or not -18000000 <= lon <= 18000000:
            raise ValueError('Invalid geometry coordinates')
        points.append([lon / 100000, lat / 100000])
        if len(points) > 50000:
            raise ValueError('Oversized geometry')
    if len(points) < 2:
        raise ValueError('Missing geometry points')
    return points


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ORSProvider:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.configured = bool(self.settings.ors_api_key.get_secret_value().strip())

    def _request(self, coordinates):
        key = self.settings.ors_api_key.get_secret_value().strip()
        payload = json.dumps({'coordinates': coordinates, 'instructions': False, 'geometry': True}).encode()
        req = request.Request(ORS_URL, data=payload, method='POST', headers={
            'Authorization': key, 'Content-Type':'application/json', 'Accept':'application/json', 'User-Agent':'AMBS-ERP/Phase6B'})
        opener = request.build_opener(NoRedirect())
        try:
            with opener.open(req, timeout=self.settings.routing_timeout_seconds) as response:
                data = response.read(MAX_BYTES + 1)
                return response.status, data, response.headers
        except error.HTTPError as response:
            # Never propagate provider error bodies, headers or request representations.
            try:
                return response.code, response.read(MAX_BYTES + 1), response.headers
            finally:
                response.close()

    def calculate_route(self, origin, destination, profile='driving-car'):
        if not self.configured:
            return RouteResult('NOT_CONFIGURED')
        if profile != 'driving-car':
            return RouteResult('INVALID_ENDPOINTS')
        coordinates = [[float(o['longitude']), float(o['latitude'])] for o in (origin, destination)]
        if any(not math.isfinite(x) or not -180<=x<=180 or not math.isfinite(y) or not -90<=y<=90 for x,y in coordinates):
            return RouteResult('INVALID_ENDPOINTS')
        try:
            status, body, headers = self._request(coordinates)
        except (error.URLError, socket.timeout, TimeoutError, OSError, ValueError):
            return RouteResult('UNAVAILABLE', attempted=True)
        if status in (401,403):
            return RouteResult('AUTH_FAILED', attempted=True)
        if status == 429:
            try:
                delay = max(60, min(86400, int(headers.get('Retry-After', 60))))
            except (TypeError, ValueError):
                delay = 60
            return RouteResult('QUOTA_EXCEEDED', attempted=True, retry_seconds=delay)
        if len(body) > MAX_BYTES:
            return RouteResult('INVALID_RESPONSE', attempted=True)
        if status in (400,404,422):
            try:
                code = json.loads(body).get('error',{}).get('code')
            except (ValueError,AttributeError):
                code = None
            return RouteResult('NO_ROUTE' if code in (2009,2010) else 'INVALID_ENDPOINTS', attempted=True)
        if status != 200:
            return RouteResult('UNAVAILABLE', attempted=True)
        try:
            data = json.loads(body)
            if not isinstance(data,dict) or not isinstance(data.get('routes'),list):
                raise ValueError('Invalid response shape')
            if not data['routes']:
                return RouteResult('NO_ROUTE', attempted=True)
            route = data['routes'][0]
            distance = number(route['summary']['distance'], 100000000)
            duration = number(route['summary']['duration'], 31536000)
            warnings = route.get('warnings',[])
            if not isinstance(warnings,list) or len(warnings)>100:
                raise ValueError('Invalid warnings')
            sanitized = []
            secret = self.settings.ors_api_key.get_secret_value().strip()
            for warning in warnings:
                if not isinstance(warning,dict) or not isinstance(warning.get('message'),str) or len(warning['message'])>4000:
                    raise ValueError('Invalid warning')
                code = warning.get('code')
                if code is not None and not isinstance(code,(int,str)):
                    raise ValueError('Invalid warning code')
                sanitized.append({'code': str(code).replace(secret,'[redacted]')[:100] if code is not None else None,
                    'message': warning['message'].replace(secret,'[redacted]')})
            metadata = data.get('metadata',{})
            echoed = metadata.get('query',{}).get('coordinates')
            if echoed is not None and echoed != coordinates:
                raise ValueError('Provider coordinate ordering mismatch')
            timestamp = metadata.get('timestamp')
            response_time = datetime.fromtimestamp(float(timestamp)/1000, UTC) if timestamp is not None else None
            geometry = decode_geometry(route['geometry']) if route.get('geometry') is not None else None
            return RouteResult('SUCCESS', distance_meters=distance, duration_seconds=duration,
                warnings=sanitized, geometry=geometry, provider_timestamp=response_time, attempted=True)
        except (ValueError, KeyError, TypeError, IndexError, AttributeError, OverflowError):
            return RouteResult('INVALID_RESPONSE', attempted=True)


def get_routing_provider():
    return ORSProvider()
