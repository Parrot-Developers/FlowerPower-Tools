#!/usr/bin/python

'''
Copyright (C) 2015 Parrot SA
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:
* Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in
the documentation and/or other materials provided with the
distribution.
* Neither the name of Parrot nor the names
of its contributors may be used to endorse or promote products
derived from this software without specific prior written
permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.
'''

import requests
import json
from pprint import pformat

username = 'parrottest.fpwebservice@gmail.com'
password = 'Parrot2015FP'
client_id = 'parrottest.fpwebservice@gmail.com'
client_secret = 'cvSjfnONllkHLymF2gEUL73PPXJiMMcVCd1VtZaIXHSGyhaT'

print("AUTHENTIFICATION")
req = requests.get('https://api-flower-power-pot.parrot.com/user/v1/authenticate',
data={'grant_type': 'password',
'username': username,
'password': password,
'client_id': client_id,
'client_secret': client_secret,
})
response = req.json()
decoded = json.dumps(response)
deco = json.loads(decoded)
access_token = deco["access_token"]
print('Server response: \n {0}'.format(pformat(response)))



print("\nGET PROFILE")
req = requests.get('https://api-flower-power-pot.parrot.com/user/v4/profile',
headers={'Authorization': 'Bearer ' + access_token})
response = req.json()
print('Server response: \n {0}'.format(pformat(response)))



print("\nGET VERSION")
req = requests.get('https://api-flower-power-pot.parrot.com/user/v1/versions',
headers={'Authorization': 'Bearer ' + access_token})
response = req.json()
print('Server response: \n {0}'.format(pformat(response)))



print("\nGARDEN LOCATION STATUSES")
req = requests.get('https://api-flower-power-pot.parrot.com/sensor_data/v4/garden_locations_status',
headers={'Authorization': 'Bearer ' + access_token})
response = req.json()
print('Server response: \n {0}'.format(pformat(response)))



print("\nSYNC DATA")
req = requests.get('https://api-flower-power-pot.parrot.com/sensor_data/v3/sync',
headers={'Authorization': 'Bearer ' + access_token},
params={'include_s3_urls': 1})
response = req.json()
decoded = json.dumps(response)
deco = json.loads(decoded)
print('Server response: \n {0}'.format(pformat(response)))



print("\nGET SAMPLES FOR LOCATION")
i = 0
for i in range(0,len(deco["locations"])):
    location_identifier = deco["locations"][i]["location_identifier"]
    req = requests.get('https://api-flower-power-pot.parrot.com/sensor_data/v2/sample/location/' + location_identifier,
    headers={'Authorization': 'Bearer ' + access_token},
    params={'from_datetime_utc': '2015-07-04T14:42:42Z',
    'to_datetime_utc': '2015-07-08T06:30:00Z'})

    response2 = req.json()
    decoded2 = json.dumps(response2)
    deco2 = json.loads(decoded2)
    print('Server response: \n {0}'.format(pformat(response2)))
    i = i + 1
