from ApiCloud import ApiCloud
from datetime import *
import csv

dateFormat = "%d-%b-%Y %H:%M:%S"

def dumpAllFlowerPower(api, fromDateTime, toDateTime):
    sensorDataSync = api.getSensorDataSync()
    for location in sensorDataSync["locations"]:
        dumpFlowerPower(api, location, fromDateTime, toDateTime)

def dumpFlowerPower(api, location, fromDateTime, toDateTime):
    fromDateTime = datetime.strptime(fromDateTime, dateFormat)
    toDateTime = datetime.strptime(toDateTime, dateFormat)

    if (location['sensor_serial']):
        print "Dump " + location['sensor_serial'] + '.csv'
        fileCsv = csv.writer(open(location['sensor_serial'] + ".csv", "w"))
        fileCsv.writerow(["capture_ts", "par_umole_m2s", "vwc_percent", "air_temperature_celsius"])

        while (fromDateTime < toDateTime):
            samplesLocation = api.getSamplesLocation(location['location_identifier'], fromDateTime, fromDateTime + timedelta(days=7))

            if (len(samplesLocation["errors"])):
                print location['sensor_serial'], samplesLocation["errors"][0]["error_message"]
                continue

            for sample in samplesLocation['samples']:
                capture_ts = sample["capture_ts"].replace("T", " ").replace("Z", "") + " UTC"
                par_umole_m2s = sample["par_umole_m2s"]
                vwc_percent = sample["vwc_percent"]
                air_temperature_celsius = sample["air_temperature_celsius"]
                fileCsv.writerow([capture_ts, par_umole_m2s, vwc_percent, air_temperature_celsius])

            fromDateTime += timedelta(days=7)
