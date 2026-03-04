import boto3
import os
from dotenv import load_dotenv

load_dotenv()
boto3.setup_default_session(
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name=os.environ.get('AWS_REGION')
)

try:
    polly = boto3.client('polly')
    response = polly.synthesize_speech(
        Text="Hello, this is a test.",
        OutputFormat='mp3',
        VoiceId='Joanna'
    )
    print("Polly Success!")
except Exception as e:
    print(f"Polly Error: {e}")

try:
    transcribe = boto3.client('transcribe')
    # Just list some jobs to check access
    transcribe.list_transcription_jobs(MaxResults=1)
    print("Transcribe Success!")
except Exception as e:
    print(f"Transcribe Error: {e}")
