from ApiCloud import ApiCloud
from CSVDump import *

# First we set our credentials
username = 'YOUR_USERNAME'
password = 'YOUR_PASSWORD'

# From the developer portal
client_id = 'CLIENT_ID'
client_secret = 'CLIENT_SECRET'

api = ApiCloud(client_id, client_secret)
api.login(username, password)

### date: 30-Mar-2015 23:59:59
dumpAllFlowerPower(api, "10-Oct-2016 11:30:00", "15-Oct-2016 12:30:00")
