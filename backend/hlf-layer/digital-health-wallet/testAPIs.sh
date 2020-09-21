#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

jq --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Please Install 'jq' https://stedolan.github.io/jq/ to execute this script"
	echo
	exit 1
fi

starttime=$(date +%s)

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  ./testAPIs.sh -l golang|node"
  echo "    -l <language> - chaincode language (defaults to \"golang\")"
}
# Language defaults to "golang"
LANGUAGE="golang"

# Parse commandline args
while getopts "h?l:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    l)  LANGUAGE=$OPTARG
    ;;
  esac
done

##set chaincode path
function setChaincodePath(){
	LANGUAGE=`echo "$LANGUAGE" | tr '[:upper:]' '[:lower:]'`
	case "$LANGUAGE" in
		"golang")
		CC_SRC_PATH="chaincode"
		;;
		"node")
		CC_SRC_PATH="$PWD/chaincode"
		;;
		*) printf "\n ------ Language $LANGUAGE is not supported yet ------\n"$
		exit 1
	esac
}

setChaincodePath

#---------Enroll Users----------------
#---------Start-----------------------
echo "POST request Enroll on Government  ..."
echo
GOVERNMENT_TOKEN=$(curl -s -X POST \
  http://localhost:4000/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Jim&orgName=Government')

echo $GOVERNMENT_TOKEN
GOVERNMENT_TOKEN=$(echo $GOVERNMENT_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "Government token is $GOVERNMENT_TOKEN"
echo
echo "POST request Enroll on Forensics ..."
echo
LABORATORY_TOKEN=$(curl -s -X POST \
  http://localhost:4000/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Jim&orgName=Laboratory')
echo $LABORATORY_TOKEN
LABORATORY_TOKEN=$(echo $LABORATORY_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "Laboratory token is $LABORATORY_TOKEN"
echo
echo
#---------Enroll Users----------------
#---------End-------------------------

#---------Create Channel--------------
#---------Start-----------------------

echo "POST request Create channel  ..."
echo
curl -s -X POST \
  http://localhost:4000/channels \
  -H "authorization: Bearer $GOVERNMENT_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"channelName":"mychannel",
	"channelConfigPath":"../channel-artifacts/mychannel.tx"
}'
echo
echo
#---------Create Channel--------------
#---------End-------------------------

#---------Join Channel----------------
#---------Start-----------------------

sleep 5
echo "POST request Join channel on Government"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/peers \
  -H "authorization: Bearer $GOVERNMENT_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.government.example.com","peer1.government.example.com"]
}'
echo
echo

echo "POST request Join channel on Laboratory"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/peers \
  -H "authorization: Bearer $LABORATORY_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.laboratory.example.com","peer1.laboratory.example.com"]
}'
echo
echo

#---------Join Channel----------------
#---------End-------------------------

#---------Update Anchor Peers---------
#---------Start-----------------------

echo "POST request Update anchor peers on Government"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/anchorpeers \
  -H "authorization: Bearer $GOVERNMENT_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"configUpdatePath":"../channel-artifacts/GovernmentMSPAnchors.tx"
}'
echo
echo

echo "POST request Update anchor peers on Laboratory"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/anchorpeers \
  -H "authorization: Bearer $LABORATORY_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"configUpdatePath":"../channel-artifacts/LaboratoryMSPAnchors.tx"
}'
echo
echo

#---------Update Anchor Peers---------
#---------Stop------------------------


#---------Install Channel-------------
#---------Start-----------------------

echo "POST Install chaincode on Government"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $GOVERNMENT_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.government.example.com\",\"peer1.government.example.com\"],
	\"chaincodeName\":\"mycc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v5\"
}"
echo
echo

echo "POST Install chaincode on Laboratory"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $LABORATORY_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.laboratory.example.com\",\"peer1.laboratory.example.com\"],
	\"chaincodeName\":\"mycc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v5\"
}"
echo
echo

#---------Install Channel-------------
#---------End-------------------------

#---------Instantiate Channel---------
#---------Start-----------------------

echo "POST instantiate chaincode on Laboratory"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/chaincodes \
  -H "authorization: Bearer $LABORATORY_TOKEN" \
  -H "content-type: application/json" \
  -d '{
  "peers": ["peer0.laboratory.example.com"],
	"chaincodeName":"mycc",
	"chaincodeVersion":"v5",
	"chaincodeType": "$LANGUAGE",
	"args":["a","100","b","200"]
}'

echo
echo


echo "POST invoke chaincode on peers of Government, Laboratory"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel/chaincodes/mycc \
  -H "authorization: Bearer $LABORATORY_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["peer0.laboratory.example.com"],
	"fcn":"invoke",
  "operation":"dummy",
	"args": ["dummy", "fyd"]
}'
echo
echo


echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
