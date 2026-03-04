import boto3
import os
from dotenv import load_dotenv
import json

load_dotenv()
boto3.setup_default_session(
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name=os.environ.get('AWS_REGION')
)
bedrock = boto3.client('bedrock-runtime')

models_to_test = [
    "amazon.nova-pro-v1:0",
    "amazon.nova-lite-v1:0",
    "amazon.nova-micro-v1:0",
    "amazon.nova-2-lite-v1:0",
    "amazon.nova-2-sonic-v1:0",
    "anthropic.claude-sonnet-4-20250514-v1:0"
]

for m in models_to_test:
    try:
        response = bedrock.converse_stream(
            modelId=m,
            messages=[{"role": "user", "content": [{"text": "Hello"}]}],
            system=[{"text": "You are a voice assistant."}],
            inferenceConfig={
                "maxTokens": 500,
                "temperature": 0.7
            },
            additionalModelRequestFields={
                "audio": {
                    "output": {
                        "sampleRate": 24000,
                        "format": "pcm"
                    }
                }
            }
        )
        print(f"{m}: SUPPORTED with audio!")
    except Exception as e:
        print(f"{m}: {e}")
