# Google Ads API Setup - Status

## What's done:
- Google Cloud project created: "Google Ads API"
- Google Ads API enabled
- OAuth2 Desktop app credentials created
- Test user added: yardendamri1@gmail.com
- Client ID and Secret added to session environment
- Auth code obtained and added to session environment as GOOGLE_ADS_DEVELOPER_TOKEN

## Environment variables set (need to be in session):
- `GOOGLE_ADS_CLIENT_ID` - set
- `GOOGLE_ADS_CLIENT_SECRET` - set
- `GOOGLE_ADS_AUTH_CODE` - set (one-time use code from OAuth flow)
- `GOOGLE_ADS_CUSTOMER_ID` - NOT set yet (value: 8993315268)
- `GOOGLE_ADS_DEVELOPER_TOKEN` - NOT set yet (still need to get from ads.google.com/aw/apicenter on desktop)

## Next step:
Run this to exchange auth code for refresh token:

```python
python3 -c "
import urllib.request, urllib.parse, json

data = urllib.parse.urlencode({
    'code': '$GOOGLE_ADS_AUTH_CODE',
    'client_id': '$GOOGLE_ADS_CLIENT_ID',
    'client_secret': '$GOOGLE_ADS_CLIENT_SECRET',
    'redirect_uri': 'urn:ietf:wg:oauth:2.0:oob',
    'grant_type': 'authorization_code'
}).encode()

req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print('refresh_token:', result.get('refresh_token'))
"
```

## Note:
Auth code is single-use and may expire. If it fails, user needs to redo OAuth flow at:
https://accounts.google.com/o/oauth2/auth?client_id=583531623656-1467q4cutg0on4t4qj627l0p44npo0fc.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&scope=https%3A//www.googleapis.com/auth/adwords&response_type=code&access_type=offline
