import boto3
import os
from dotenv import load_dotenv

load_dotenv()
boto3.setup_default_session(
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name=os.environ.get('AWS_REGION')
)
bedrock = boto3.client('bedrock')
models = bedrock.list_foundation_models()
for m in models['modelSummaries']:
    if 'nova' in m['modelId'].lower() or 'claude' in m['modelId'].lower():
        print(m['modelId'])
