The raspberry/flowerPower program :

Purpose

This program allow your raspberry to retrieve and upload your sensors' data (the ones associated to your account) automatically and regularly.

How it works

The first function is used to read the authentication parameters contained in the params.txt file. 
Each line is read and pushed in the param tab. 

The second function is used to associate each unit of the param tab to the corresponding variable. A new CloudAPI object is created with those four parameters. 

The third function is used to login using the known parameters and to recover all the information that belong to this specific user. 
	> tabSensors contains all the sensors (UUID) associated to the account
	> tabIndex contains the last index from which the history of each sensor was recover

The fourth function is used to put every UUID contained in tabSensors under an understandable format in order to be used in the upcoming functions. Each new UUID is pushed in the uuidTab.

The fifth function is used to scan the BLE environment, each time a BLE device is found its UUID is compared to every UUID contained in the uuidTab. If there is a match between the found device's UUID and one of the UUID contained in the previous mentioned tab this device is pushed in tab at the same index as the one in the uuidTab and so in the tabIndex in order not to mix up the index and the device. This function contains a timeout which stops the discoverAll function after not having found a BLE device within 10 seconds.

The sixth function recovers some information about every sensors contained in tab one at a time. It recovers its history starting form the corresponding index contained in tabIndex. This history is then stored in uuidOfTheSensor.txt. Then the function uploads this history on the web service using the uploadGarden function, which was written for this purpose (this function is found in the flower-power-cloud.js). 

How to use it 

Installing this program on your raspberry is really easy. It works with any BLE-equipped/BLE-dongle-equipped computers as well.

Let's see how to make it work on a raspberry.
- First, you need a raspberry with a USB BLE dongle. This raspberry must be up and running.
- Then you need to install some required tools on your raspberry.
	First, nodejs needs to be installed, proceed as following 
	sudo apt-get update sudo apt-get upgrade
	curl -sL https://deb.nodesource.com/setup | sudo bash -
	sudo apt-get install nodejs
	Then do a node –version to check if it worked
	

	Then we need to install the BLE libraries, just follow the steps at 
	http://www.jaredwolff.com/blog/get-started-with-bluetooth-low-energy/
	To check if it worked, just do a sudo hcitools lescan, if it shows you a list of surrounding 	BLE devices – or at least your Flower Power -- it worked. 
	If not, do a sudo apt-get install bluez and try again.

	After that, we need to install npm, we need it to install the program dependencies
	sudo apt-get install npm

- Once everything is setup, we can install the program.
	Create a folder to put the program in. 
	Place yourself in this new folder.
	Do the following commands :
	
npm install async@1.0.0
npm install debug
npm install fs
npm install lazy
npm install noble
npm install node-uuid
npm install request
npm install sync
npm install noble-device@0.1.2
git clone https://github.com/Parrot-Developers/FlowerPower-Tools.git
cd node_modules
git clone https://github.com/Parrot-Developers/node-flower-power.git -b BLE-cloud-bridge 
git clone https://github.com/Parrot-Developers/node-flower-power-cloud.git

    Tested with the following versions : async@1.0.0/debug@2.2.0/fs@0.0.2/lazy1.0.11/noble@1.0.2/node-uuid@1.4.3/request@2.60.0/sync@0.2.5/noble-device@0.1.2

- Before testing the program, you need to edit params.txt with your own credentials, be careful, the order is very important.

- After everything is installed, you can try the program by placing yourself into the node_modules/flower-power folder and by doing a sudo node test.js

- You have now an up and running program, but the purpose of it is to work in an autonomous way. For that, we just need to use the crontab to start the program automatically every 30 minutes for example. Do as following :
	sudo crontab -e 
	Then you can edit the crontab of your raspberry. Edit it by writing in it 
	*/30 * * * * cd PATH_TO_BLE-cloud-bridge && sudo sh scriptForCrontab.sh >> results.log
	What we do here is to launch the scritpForCrontab script that will actually launch the 	program every 30 minutes. 


Now that everything is setup, you can check your sensors' data, updated automatically every 30 minutes at https://myflowerpower.parrot.com/
