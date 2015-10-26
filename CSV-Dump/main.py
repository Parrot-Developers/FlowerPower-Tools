from ApiCloud import ApiCloud
from CSVDump import *

api = ApiCloud("parrottest.fpwebservice@gmail.com", "cvSjfnONllkHLymF2gEUL73PPXJiMMcVCd1VtZaIXHSGyhaT")
api.login("parrottest.fpwebservice@gmail.com", "Parrot2015FP")

### date: 30-Mar-2015 23:59:59
dumpAllFlowerPower(api, "10-Oct-2015 11:30:00", "29-Oct-2015 11:30:00")
