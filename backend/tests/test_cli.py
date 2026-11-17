import secrets
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pydantic import SecretStr

from app import cli
from app.core.security import SecurityError


@pytest.fixture
def provisioning(monkeypatch):
    password = SecretStr(secrets.token_urlsafe(24))
    database = MagicMock()
    database.scalar.return_value = None
    sessions = MagicMock()
    sessions.return_value.__enter__.return_value = database
    inputs = MagicMock(
        side_effect=["AMBS.Admin", "admin@example.com", "AMBS Administrator"]
    )
    passwords = MagicMock(
        side_effect=[password.get_secret_value(), password.get_secret_value()]
    )
    provision = MagicMock()
    monkeypatch.setattr(cli, "SessionLocal", sessions)
    monkeypatch.setattr(cli, "provision_admin", provision)
    monkeypatch.setattr("builtins.input", inputs)
    monkeypatch.setattr(cli.getpass, "getpass", passwords)
    monkeypatch.setattr(cli.sys, "argv", ["cli", "provision-admin"])
    monkeypatch.setattr(cli.sys.stdin, "isatty", lambda: True)
    return SimpleNamespace(
        password=password,
        database=database,
        inputs=inputs,
        passwords=passwords,
        provision=provision,
    )


def assert_private_output(capsys, *passwords):
    captured = capsys.readouterr()
    output = captured.out + captured.err
    exposed = any(password.get_secret_value() in output for password in passwords)
    assert not exposed, "Secret material appeared in CLI output"
    return output


@pytest.mark.parametrize("email", [" ADMIN@EXAMPLE.COM ", "", "   "])
def test_valid_interactive_provisioning(provisioning, capsys, email):
    provisioning.inputs.side_effect = [" AMBS.Admin ", email, " AMBS Administrator "]
    assert cli.main() == 0
    provisioning.provision.assert_called_once()
    data = provisioning.provision.call_args.args[1]
    assert data.username == "ambs.admin"
    assert data.email == ("admin@example.com" if email.strip() else None)
    assert data.display_name == "AMBS Administrator"
    password_matches = (
        data.password.get_secret_value() == provisioning.password.get_secret_value()
    )
    assert password_matches
    assert provisioning.passwords.call_count == 2
    assert "Administrator created" in assert_private_output(
        capsys, provisioning.password
    )


@pytest.mark.parametrize(
    ("username", "email", "display_name", "message"),
    [
        ("admin@example.com", "", "Administrator", "Username must be"),
        ("am", "", "Administrator", "Username must be"),
        ("AMBS Admin", "", "Administrator", "Username must be"),
        ("ambs.admin", "admin@ambs.local", "Administrator", "Email must be"),
        ("ambs.admin", "invalid-email", "Administrator", "Email must be"),
        ("ambs.admin", "", "   ", "Display name must contain"),
        ("ambs.admin", "", "A" * 121, "Display name must contain"),
        ("ambs.admin", "", "Name\x00", "Display name must contain"),
    ],
)
def test_invalid_account_fields(
    provisioning, capsys, username, email, display_name, message
):
    provisioning.inputs.side_effect = [username, email, display_name]
    assert cli.main() == 1
    provisioning.provision.assert_not_called()
    output = assert_private_output(capsys, provisioning.password)
    assert message in output
    assert "input_value" not in output


@pytest.mark.parametrize("length", [11, 129])
def test_password_length_feedback_is_private(provisioning, capsys, length):
    password = SecretStr(secrets.token_hex(65)[:length])
    provisioning.passwords.side_effect = [
        password.get_secret_value(),
        password.get_secret_value(),
    ]
    assert cli.main() == 1
    provisioning.provision.assert_not_called()
    output = assert_private_output(capsys, password)
    assert "Password must contain 12-128 characters." in output
    assert "input_value" not in output


def test_all_field_errors_are_reported_without_values(provisioning, capsys):
    # A secret accidentally pasted into any field must never appear in feedback.
    password = SecretStr(secrets.token_urlsafe(100))
    provisioning.inputs.side_effect = [password.get_secret_value()] * 3
    provisioning.passwords.side_effect = [password.get_secret_value()] * 2
    assert cli.main() == 1
    output = assert_private_output(capsys, password)
    for message in (
        "Username must be",
        "Email must be",
        "Display name must contain",
        "Password must contain",
    ):
        assert message in output
    provisioning.provision.assert_not_called()


def test_password_confirmation_mismatch(provisioning, capsys):
    confirmation = SecretStr(secrets.token_urlsafe(24))
    provisioning.passwords.side_effect = [
        provisioning.password.get_secret_value(),
        confirmation.get_secret_value(),
    ]
    assert cli.main() == 1
    provisioning.provision.assert_not_called()
    output = assert_private_output(capsys, provisioning.password, confirmation)
    assert "Passwords do not match." in output


def test_existing_admin_refused_before_prompts(provisioning, capsys):
    provisioning.database.scalar.return_value = True
    assert cli.main() == 1
    provisioning.inputs.assert_not_called()
    provisioning.passwords.assert_not_called()
    provisioning.provision.assert_not_called()
    assert "A SUPER_ADMIN already exists" in assert_private_output(
        capsys, provisioning.password
    )


def test_concurrent_admin_creation_refused(provisioning, capsys):
    provisioning.provision.side_effect = SecurityError(
        409,
        "ADMIN_EXISTS",
        "A SUPER_ADMIN already exists. Use authenticated user management.",
    )
    assert cli.main() == 1
    assert "A SUPER_ADMIN already exists" in assert_private_output(
        capsys, provisioning.password
    )


@pytest.mark.parametrize("command", ["verify-admin-password", "reset-admin-password"])
def test_recovery_commands_require_interactive_entry(
    provisioning, monkeypatch, capsys, command
):
    monkeypatch.setattr(cli.sys, "argv", ["cli", command])
    monkeypatch.setattr(cli.sys.stdin, "isatty", lambda: False)
    assert cli.main() == 1
    provisioning.inputs.assert_not_called()
    provisioning.passwords.assert_not_called()
    assert "interactive terminal" in assert_private_output(
        capsys, provisioning.password
    )


def test_interactive_admin_password_verification(provisioning, monkeypatch, capsys):
    verify = MagicMock()
    monkeypatch.setattr(cli, "verify_admin_password", verify)
    monkeypatch.setattr(cli.sys, "argv", ["cli", "verify-admin-password"])
    provisioning.inputs.side_effect = ["admin"]
    assert cli.main() == 0
    verify.assert_called_once()
    assert isinstance(verify.call_args.args[2], SecretStr)
    provisioning.provision.assert_not_called()
    assert "password verified" in assert_private_output(capsys, provisioning.password)


def test_interactive_admin_reset_is_explicit(provisioning, monkeypatch, capsys):
    reset = MagicMock()
    monkeypatch.setattr(cli, "reset_admin_password", reset)
    monkeypatch.setattr(cli.sys, "argv", ["cli", "reset-admin-password"])
    provisioning.inputs.side_effect = ["admin"]
    assert cli.main() == 0
    reset.assert_called_once()
    assert isinstance(reset.call_args.args[2].password, SecretStr)
    assert provisioning.passwords.call_count == 2
    provisioning.provision.assert_not_called()
    assert "password reset" in assert_private_output(capsys, provisioning.password)


def test_admin_reset_confirmation_mismatch(provisioning, monkeypatch, capsys):
    reset = MagicMock()
    confirmation = SecretStr(secrets.token_urlsafe(24))
    monkeypatch.setattr(cli, "reset_admin_password", reset)
    monkeypatch.setattr(cli.sys, "argv", ["cli", "reset-admin-password"])
    provisioning.inputs.side_effect = ["admin"]
    provisioning.passwords.side_effect = [
        provisioning.password.get_secret_value(),
        confirmation.get_secret_value(),
    ]
    assert cli.main() == 1
    reset.assert_not_called()
    assert "Passwords do not match" in assert_private_output(
        capsys, provisioning.password, confirmation
    )


def test_admin_reset_rejects_invalid_password_privately(
    provisioning, monkeypatch, capsys
):
    reset = MagicMock()
    password = SecretStr(secrets.token_urlsafe(4))
    monkeypatch.setattr(cli, "reset_admin_password", reset)
    monkeypatch.setattr(cli.sys, "argv", ["cli", "reset-admin-password"])
    provisioning.inputs.side_effect = ["admin"]
    provisioning.passwords.side_effect = [password.get_secret_value()] * 2
    assert cli.main() == 1
    reset.assert_not_called()
    assert "Password must contain 12-128" in assert_private_output(capsys, password)
