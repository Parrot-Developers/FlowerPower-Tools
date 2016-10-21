from ApiCloud import ApiCloud
from datetime import *
import csv

dateFormat = "%d-%b-%Y %H:%M:%S"

def dumpAllFlowerPower(api, since="born", until="today"):
    sensorDataSync = api.getSensorDataSync()
    for location in sensorDataSync["locations"]:
        err = dumpFlowerPower(api, location, since, until)
        if (err == -1):
            print "Your 'Since' date is after your 'Until' date !?"
            break ;


def dumpFlowerPower(api, location, since, until):
    if (until == "today"):
        until = datetime.today()
    else:
        until = datetime.strptime(until, dateFormat)
    if (since == "born"):
        since = until - timedelta(days=7)
    else:
        since = datetime.strptime(since, dateFormat)

    if (since > until):
        return -1
    elif (location['sensor']):
        print "Dump " + location['sensor']['sensor_identifier'] + '.csv'
        print " From: " + str(since)[:19]
        print " To:   " + str(until)[:19]
        fileCsv = csv.writer(open(location['sensor']['sensor_identifier'] + ".csv", "w"))
        fileCsv.writerow(["capture_datetime_utc", "fertilizer_level", "light", "soil_moisture_percent", "air_temperature_celsius"])

        while (since < until):
            samplesLocation = api.getSamplesLocation(location['location_identifier'], since, since + timedelta(days=7))

            if (len(samplesLocation["errors"])):
                print location['sensor']['sensor_identifier'], samplesLocation["errors"][0]["error_message"]
                continue

            for sample in samplesLocation['samples']:
                capture_datetime_utc = sample["capture_datetime_utc"].replace("T", " ").replace("Z", "") + " UTC"
                fertilizer_level = sample["fertilizer_level"]
                soil_moisture_percent = sample["soil_moisture_percent"]
                air_temperature_celsius = sample["air_temperature_celsius"]
                light = sample["light"]
                fileCsv.writerow([capture_datetime_utc, fertilizer_level, light, soil_moisture_percent, air_temperature_celsius])

            since += timedelta(days=7)
        print
        return 0
