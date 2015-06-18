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

import struct
import time
import pickle
import logging
import logging.handlers
import requests
import json
from pprint import pformat
import csv
import datetime
import re

username = 'YOURS'
password = 'YOURS'
client_id = 'YOURS'
client_secret = 'YOURS'
fromFormat = datetime.datetime(2015, 05, 20, 0, 0, 0) # Format YY-MM-DD HH:MM:SS
toFormat = datetime.datetime(2015, 05, 22, 0 , 0, 0) # Format YY-MM-DD HH:MM:SS
toFormatBase = toFormat

req = requests.get('https://apiflowerpower.parrot.com/user/v1/authenticate',
                   data={'grant_type': 'password',
                         'username': username,
                         'password': password,
                         'client_id': client_id,
                         'client_secret': client_secret,
                        })
response = req.json()
print('\nAuthentification successful\n')
decoded = json.dumps(response)
deco = json.loads(decoded)
access_token = deco["access_token"]

req = requests.get('https://apiflowerpower.parrot.com/sensor_data/v3/sync',
                   headers={'Authorization': 'Bearer ' + access_token},
                   params={'include_s3_urls': 1})
response = req.json()
decoded = json.dumps(response)
deco = json.loads(decoded)

loop1 = 0
loop2 = 0
loop3 = 0
numberOfWeeks = 0
seven_days = datetime.timedelta(days=7)

if (toFormat - fromFormat) > seven_days:
    regex = re.compile('[0-9]+') 
    numberOfWeeks = int((int(regex.search(str(toFormat - fromFormat)).group(0)))/7)
    for loop1 in range(0, numberOfWeeks + 1):
        if loop1 > 0:
            if toFormatBase - toFormat < seven_days:
                toFormat = toFormatBase
                fromFormat = (fromFormat + seven_days)
            else:
                fromFormat = (fromFormat + seven_days)
                toFormat = (fromFormat + seven_days)
        else:
            toFormat = (fromFormat + seven_days)   

        for loop2 in range(0,len(deco["locations"])):
            location_identifier = deco["locations"][loop2]["location_identifier"]
            sensor_serial = deco["locations"][loop2]["sensor_serial"]
            req = requests.get('https://apiflowerpower.parrot.com/sensor_data/v2/sample/location/' + location_identifier, 
                            headers={'Authorization': 'Bearer ' + access_token},
                            params={'from_datetime_utc': fromFormat,
                                    'to_datetime_utc': toFormat})

            response2 = req.json()
            decoded2 = json.dumps(response2)
            deco2 = json.loads(decoded2)
            
            print("Retrieving samples for sensor " + sensor_serial + " Week " + str(loop1))
            
            c = csv.writer(open(sensor_serial + ".csv", "a"))
            
            if loop1 == 0:
                c.writerow(["capture_ts","par_umole_m2s","vwc_percent","air_temperature_celsius"])
    
            for loop3 in range(0,len(deco2["samples"])):
                tmp = deco2["samples"][loop3]["capture_ts"].replace("T", " ")
                date = tmp.replace("Z"," ")
                c.writerow([date + " UTC",deco2["samples"][loop3]["par_umole_m2s"],deco2["samples"][loop3]["vwc_percent"],deco2["samples"][loop3]["air_temperature_celsius"]])
                loop3 = loop3 + 1 
            loop2 = loop2 + 1
    loop3 = loop3 + 1
        
else:
    for loop2 in range(0,len(deco["locations"])):
        location_identifier = deco["locations"][loop2]["location_identifier"]
        sensor_serial = deco["locations"][loop2]["sensor_serial"]
        req = requests.get('https://apiflowerpower.parrot.com/sensor_data/v2/sample/location/' + location_identifier, 
                        headers={'Authorization': 'Bearer ' + access_token},
                        params={'from_datetime_utc': fromFormat,
                                'to_datetime_utc': toFormat})

        response2 = req.json()
        decoded2 = json.dumps(response2)
        deco2 = json.loads(decoded2)
        
        print("Retrieving samples for sensor " + sensor_serial + "\n")
        
        c = csv.writer(open(sensor_serial + ".csv", "w"))
            
        c.writerow(["capture_ts","par_umole_m2s","vwc_percent","air_temperature_celsius"])
    
        for loop3 in range(0,len(deco2["samples"])):
            tmp = deco2["samples"][loop3]["capture_ts"].replace("T", " ")
            date = tmp.replace("Z"," ")
            c.writerow([date + " UTC",deco2["samples"][loop3]["par_umole_m2s"],deco2["samples"][loop3]["vwc_percent"],deco2["samples"][loop3]["air_temperature_celsius"]])
            loop3 = loop3 + 1
        loop2 = loop2 + 1
        
print("\nDone retrieving samples and filling CSV files\n")
