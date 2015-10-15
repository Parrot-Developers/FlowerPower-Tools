<h1>Flower Bridge</h1>

https://en.wikipedia.org/wiki/Tower_Bridge

<h2>How to install</h2>

This program works with any BLE-equipped/BLE-dongle-equipped computers as well.
To install it on your raspberry is really easy. You require Node (with npm) and BLE libraries.

First, you need a raspberry with a USB BLE dongle. This raspberry must be up and running.
<h3>Step 1:</h3>
 * 
 * Then you need to install some required tools on your raspberry.
	First, nodejs needs to be installed, proceed as following:
```bash
   $ sudo apt-get update && sudo apt-get upgrade
   $ curl -sL https://deb.nodesource.com/setup | sudo bash -
   $ sudo apt-get install nodejs
```
	
	
Then do a `node --version` to check if it worked.

Then we need to install the BLE libraries, just follow the steps at http://www.jaredwolff.com/blog/get-started-with-bluetooth-low-energy/

To check if it worked, just do a sudo hcitools lescan, if it shows you a list of surrounding BLE devices – or at least your Flower Power -- it worked. If not, do a sudo apt-get install bluez and try again.

Now, if Nodejs and BLE libraries are installed, clone this repository and do:
```bash
$ ./configure
```

**How to use it**
```bash
$ npm start
```

**How it works**
* Login Cloud
* Loop (every 15 minutes by default)
  * Get Inforamtions from Cloud
    * Your garden
    * Your user-config
  * For each of your FlowerPowers (1 by 1)
    * Scan to discover the Flower Power
    * Retrieve his history samples
    * Send his history samples to the Cloud
* End Loop

The program relive a new `Loop` only if all Flower Powers have been checked.
