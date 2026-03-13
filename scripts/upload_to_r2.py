"""
Upload JSON tile files to Cloudflare R2.

Uses boto3 with S3-compatible endpoint. Requires environment variables:
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_ENDPOINT (e.g., https://<account_id>.r2.cloudflarestorage.com)
- R2_BUCKET_NAME (e.g., fuel-finder-data)

Usage:
    python scripts/upload_to_r2.py <directory> [--prefix tiles/fuel]
"""

import os
import sys
import json
import argparse
import mimetypes
from pathlib import Path

import boto3
from botocore.config import Config


def get_r2_client():
    """Create an S3-compatible client for Cloudflare R2."""
    endpoint = os.environ.get("R2_ENDPOINT")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")

    if not all([endpoint, access_key, secret_key]):
        print("ERROR: Missing R2 environment variables.", file=sys.stderr)
        print("Required: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY", file=sys.stderr)
        sys.exit(1)

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(
            region_name="auto",
            signature_version="s3v4",
        ),
    )


def upload_file(client, bucket: str, local_path: Path, r2_key: str) -> None:
    """Upload a single file to R2 with appropriate headers."""
    content_type = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"

    if local_path.suffix == ".json":
        content_type = "application/json"

    extra_args = {
        "ContentType": content_type,
        "CacheControl": "public, max-age=3600",
    }

    client.upload_file(
        str(local_path),
        bucket,
        r2_key,
        ExtraArgs=extra_args,
    )
    print(f"  Uploaded: {r2_key} ({local_path.stat().st_size:,} bytes)")


def upload_directory(directory: str, prefix: str = "") -> int:
    """Upload all files in a directory to R2. Returns count of uploaded files."""
    client = get_r2_client()
    bucket = os.environ.get("R2_BUCKET_NAME", "fuel-finder-data")
    dir_path = Path(directory)

    if not dir_path.is_dir():
        print(f"ERROR: {directory} is not a directory", file=sys.stderr)
        sys.exit(1)

    count = 0
    for file_path in sorted(dir_path.rglob("*")):
        if file_path.is_file():
            relative = file_path.relative_to(dir_path)
            r2_key = f"{prefix}/{relative}" if prefix else str(relative)
            r2_key = r2_key.replace("\\", "/")  # Windows compat
            upload_file(client, bucket, file_path, r2_key)
            count += 1

    print(f"\nUploaded {count} files to r2://{bucket}/{prefix}")
    return count


def main():
    parser = argparse.ArgumentParser(description="Upload files to Cloudflare R2")
    parser.add_argument("directory", help="Local directory to upload")
    parser.add_argument("--prefix", default="", help="R2 key prefix (e.g., tiles/fuel)")
    args = parser.parse_args()

    upload_directory(args.directory, args.prefix)


if __name__ == "__main__":
    main()
