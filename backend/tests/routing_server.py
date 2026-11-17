"""Test-only browser server. An explicit scratch database is mandatory; no live network."""
import re
from app.core.config import get_settings
from app.main import app
from app.services.route_provider import ORSProvider, get_routing_provider
from pydantic import SecretStr

settings=get_settings()
if settings.app_env!='test' or not re.fullmatch(r'ambs_http_test_[a-f0-9]{32}',settings.postgres_db):
    raise RuntimeError('Mock routing server requires an isolated HTTP test database')


class BrowserProvider(ORSProvider):
    def __init__(self):
        super().__init__(settings.model_copy(update={'ors_api_key':SecretStr('isolated-routing-fixture')}))
        self.configured=True

    def _request(self,coordinates):
        import json
        # Deterministic provider fixture only; it is never selected by the application.
        # Distinct verified synthetic destination pins exercise controlled failures.
        longitude=coordinates[1][0]
        if longitude==55.3:
            return 429,b'{}',{'Retry-After':'60'}
        if longitude==55.4:
            return 503,b'{}',{}
        if longitude==55.5:
            return 401,b'{}',{}
        if longitude==55.6:
            return 200,b'{"routes":[]}',{}
        if longitude==55.7:
            return 200,b'{"routes":[{"summary":{"distance":"bad"}}]}',{}
        # Polyline generated from this fixture's actual request points.
        points=[coordinates[0],[(coordinates[0][0]+coordinates[1][0])/2+0.01,(coordinates[0][1]+coordinates[1][1])/2],coordinates[1]]
        encoded='';last=[0,0]
        for lon,lat in points:
            for i,value in enumerate([round(lat*100000),round(lon*100000)]):
                delta=value-last[i];last[i]=value
                v=~(delta<<1) if delta<0 else delta<<1
                while v>=32:
                    encoded+=chr((32|(v&31))+63);v>>=5
                encoded+=chr(v+63)
        payload={'routes':[{'summary':{'distance':12345.6,'duration':765.4},'geometry':encoded,
            'warnings':[{'code':1,'message':'Synthetic road access restriction: review vehicle suitability'}]}],
            'metadata':{'timestamp':1794900000000,'query':{'coordinates':coordinates}}}
        return 200,json.dumps(payload).encode(),{}


app.dependency_overrides[get_routing_provider]=lambda:BrowserProvider()
