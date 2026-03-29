# USES

This file shows `curl` examples only for the asset APIs.

Local defaults used below:

```bash
BASE_URL=http://localhost:4100
SECRET_KEY=123456
```

For now, the external project can use:

```bash
Authorization: Bearer <SECRET_KEY>
```

## Upload Assets

```bash
curl -X POST "$BASE_URL/api/v1/assets/upload" \
  -H "Authorization: Bearer $SECRET_KEY" \
  -F "files=@./sample.jpg" \
  -F "files=@./sample.pdf"
```

## List Assets

```bash
curl "$BASE_URL/api/v1/assets" \
  -H "Authorization: Bearer $SECRET_KEY"
```

## Get One Asset

```bash
curl "$BASE_URL/api/v1/assets/ASSET_ID" \
  -H "Authorization: Bearer $SECRET_KEY"
```

## Update Asset Metadata

Currently this updates `original_name`.

```bash
curl -X PATCH "$BASE_URL/api/v1/assets/ASSET_ID" \
  -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "original_name": "renamed-image.jpg"
  }'
```

## Delete Asset

```bash
curl -X DELETE "$BASE_URL/api/v1/assets/ASSET_ID" \
  -H "Authorization: Bearer $SECRET_KEY"
```

## Open Public File URL

After upload, the file URL is public:

```bash
curl "$BASE_URL/storage/data/ASSET_ID/renamed-image.jpg"
```

## Notes

- `SECRET_KEY` comes from `.env`
- for now this token is used for external project integration
- later, when full user integration is ready, this flow can be replaced
