<h1>CSV-Dump</h1>

<h2>Api-Cloud</h2>
The module `ApiCloud` is a class which communicate whit the web service.
You have to inquire your apiKey and apiSecret and call the methode `.login` before all.
```python
from ApiCloud import ApiCloud

api = ApiCloud("apiKey", "apiSecret")
api.login("username", "password")
```

<h2>Dump-Csv</h2>
Now you can use the `CSVDump` module. The function `dumpAllFlowerPower` will get your `sensor_serial` from cloud, and for each sensor, create 1 .csv where there will be all samples.
This function need the instance of ApiCloud, a "from date time" and "to date time":
```python
from CSVDump import *

dumpAllFlowerPower(api, formDateTime, toDateTime)
```
The date format is: `day-month-year hour:minute:seconde`

<h2>Example: main.py</h2>
```python
from ApiCloud import ApiCloud
from CSVDump import *

api = ApiCloud("parrottest.fpwebservice@gmail.com", "cvSjfnONllkHLymF2gEUL73PPXJiMMcVCd1VtZaIXHSGyhaT")
api.login("parrottest.fpwebservice@gmail.com", "Parrot2015FP")

### date: 30-Mar-2015 23:59:59
dumpAllFlowerPower(api, "10-Oct-2015 11:30:00", "29-Oct-2015 11:30:00")
```

<h2>Just run</h2>
Edit `main.py` file and:
```bash
$ python main.py
```
