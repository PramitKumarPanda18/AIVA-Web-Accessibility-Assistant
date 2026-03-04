import boto3
import os
from dotenv import load_dotenv

load_dotenv()
boto3.setup_default_session(
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name=os.environ.get('AWS_REGION')
)
bedrock = boto3.client('bedrock-runtime')

models = [
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0"
]

for m in models:
    try:
        response = bedrock.converse(
            modelId=m,
            messages=[{"role": "user", "content": [{"text": "Hello"}]}]
        )
        print(f"{m} Success!")
        break
    except Exception as e:
        print(f"{m} Error: {e}")
