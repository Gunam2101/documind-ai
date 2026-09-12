import pytest

def test_create_collection(client, auth_headers):
    response = client.post(
        "/api/collections",
        headers=auth_headers,
        json={
            "name": "Machine Learning Papers",
            "description": "Collection of ML & AI notes"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Machine Learning Papers"
    assert "id" in data

def test_list_collections(client, auth_headers):
    response = client.get("/api/collections", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
