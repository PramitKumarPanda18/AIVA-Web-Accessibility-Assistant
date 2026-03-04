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

try:
    # Just a small dummy audio block check
    response = bedrock.converse(
        modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0",
        messages=[{
            "role": "user", 
            "content": [
                {"text": "Transcribe this audio:"},
                {"audio": {"format": "wav", "source": {"bytes": b"RIFF\x2c\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"}}}
            ]
        }]
    )
    print("Bedrock Audio Input Success!")
except Exception as e:
    print(f"Bedrock Audio Input Error: {e}")
