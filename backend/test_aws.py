import boto3
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing AWS credentials...")
boto3.setup_default_session(
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name=os.environ.get('AWS_REGION')
)

try:
    sts = boto3.client('sts')
    identity = sts.get_caller_identity()
    print(f"Authenticated as: {identity['Arn']}")
except Exception as e:
    print(f"Auth error: {e}")

try:
    print("Testing Bedrock Runtime...")
    bedrock = boto3.client('bedrock-runtime')
    response = bedrock.converse(
        modelId="amazon.nova-sonic-v1:0",
        messages=[{"role": "user", "content": [{"text": "Hello"}]}]
    )
    print("Bedrock success!")
except Exception as e:
    print(f"Bedrock error: {e}")
