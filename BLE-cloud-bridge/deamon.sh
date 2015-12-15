sudo ./run running
if [ "$?" == 1 ]
then
	sudo ./run restart > /dev/null
fi
