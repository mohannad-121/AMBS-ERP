from sqlalchemy import select

from app.models.security import Role
from tests.test_master import post, signed  # noqa: F401
from tests.test_security import security_db, accounts, browser, login, csrf  # noqa: F401


def test_project_status_does_not_bypass_archive_permission(
    signed, accounts, security_db
):
    customer = post(signed, "customers", {"name": "Synthetic scope"})
    maker, _ = security_db
    with maker() as db:
        role = db.scalar(select(Role).where(Role.code == "OPERATIONS"))
        role.permissions = [
            permission
            for permission in role.permissions
            if permission.code != "projects.archive"
        ]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    post(
        signed,
        "projects",
        {
            "name": "Forbidden archived project",
            "customer_id": customer["id"],
            "status": "archived",
        },
        403,
    )
    project = post(
        signed, "projects", {"name": "Allowed project", "customer_id": customer["id"]}
    )
    assert (
        signed.put(
            f"/api/master/projects/{project['id']}",
            json={
                "name": "Forbidden archive",
                "customer_id": customer["id"],
                "status": "archived",
            },
            headers=csrf(signed),
        ).status_code
        == 403
    )
