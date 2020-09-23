export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}
export VERBOSE=false

# Print the usage message
function printHelp() {
  echo "Usage: "
  echo "bash byfn1.sh generate police lawyers forensics court"
}


# Using docker-compose-e2e-template.yaml, replace constants with private key file names
# generated by the cryptogen tool and output a docker-compose.yaml specific to this
# configuration
function replacePrivateKey() {
  # sed on MacOSX does not support -i flag with a null extension. We will use
  # 't' for our back-up's extension and delete it at the end of the function
  ARCH=$(uname -s | grep Darwin)
  if [ "$ARCH" == "Darwin" ]; then
    OPTS="-it"
  else
    OPTS="-i"
  fi

  # Copy the template to the file that will be modified to add the private key
  cp ${CURRENT_DIR}/docker-compose-e2e-template.yaml ${CURRENT_DIR}/docker-compose-e2e.yaml
  cp ${CURRENT_DIR}/artifacts/network-config-template.yaml ${CURRENT_DIR}/artifacts/network-config.yaml

  # The next steps will replace the template's contents with the
  # actual values of the private key file names for the two CAs.
  #CURRENT_DIR=$PWD
  echo "Current dir: ${CURRENT_DIR}"
  i=0
  for x in ${PEERS[@]}
  do
    orgName="${x}.example.com"
    caps="${x,,}"
    caps="${caps^}"
    caName="${caps}_CA_PRIVATE_KEY"
    keyStore="${caps}_KEYSTORE"
    if [ $i -gt 0 ]; then
      cd ${CURRENT_DIR}/crypto-config/peerOrganizations/$orgName/ca/
      PRIV_KEY=$(ls *_sk)
      sed $OPTS "s/${caName}/${PRIV_KEY}/g" ${CURRENT_DIR}/docker-compose-e2e.yaml

      cd ${CURRENT_DIR}/crypto-config/peerOrganizations/$orgName/users/Admin@${x}.example.com/msp/keystore
      PRIV_KEY=$(ls *_sk)
      sed $OPTS "s/${keyStore}/${PRIV_KEY}/g" ${CURRENT_DIR}/artifacts/network-config.yaml
    fi
    i=$((i + 1))
  done

  # If MacOSX, remove the temporary backup of the docker-compose file
  if [ "$ARCH" == "Darwin" ]; then
    rm docker-compose-e2e.yamlt
  fi
}

function generateCerts() {
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "##########################################################"
  echo "##### Generate certificates using cryptogen tool #########"
  echo "##########################################################"

  if [ -d "crypto-config" ]; then
    rm -Rf crypto-config
  fi
  set -x
  cryptogen generate --config=./crypto-config.yaml
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  echo
}

function generateChannelArtifacts() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi

  echo "##########################################################"
  echo "#########  Generating Orderer Genesis block ##############"
  echo "##########################################################"
  # Note: For some unknown reason (at least for now) the block file can't be
  # named orderer.genesis.block or the orderer will fail to launch!
  echo "CONSENSUS_TYPE="$CONSENSUS_TYPE
  set -x
  if [ "$CONSENSUS_TYPE" == "solo" ]; then
    configtxgen -profile FourOrgsOrdererGenesis -channelID $SYS_CHANNEL -outputBlock ${CURRENT_DIR}/channel-artifacts/genesis.block
  elif [ "$CONSENSUS_TYPE" == "kafka" ]; then
    configtxgen -profile SampleDevModeKafka -channelID $SYS_CHANNEL -outputBlock ${CURRENT_DIR}/channel-artifacts/genesis.block
  elif [ "$CONSENSUS_TYPE" == "etcdraft" ]; then
    configtxgen -profile SampleMultiNodeEtcdRaft -channelID $SYS_CHANNEL -outputBlock ${CURRENT_DIR}/channel-artifacts/genesis.block
  else
    set +x
    echo "unrecognized CONSESUS_TYPE='$CONSENSUS_TYPE'. exiting"
    exit 1
  fi
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
  echo
  echo "#################################################################"
  echo "### Generating channel configuration transaction 'channel.tx' ###"
  echo "#################################################################"
  set -x
  configtxgen -profile FourOrgsChannel -outputCreateChannelTx ${CURRENT_DIR}/channel-artifacts/mychannel.tx -channelID $CHANNEL_NAME
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate channel configuration transaction..."
    exit 1
  fi

  i=0
  echo "len: ${len}"
  for x in ${PEERS[@]}
  do
    if [ $i -gt 0 ]; then
      caps="${x,,}"
      caps="${caps^}"
      chAr="${caps}MSPanchors.tx"
      msp="${caps}MSP"
      echo
      echo "#################################################################"
      echo "#######    Generating anchor peer update for ${caps}MSP   ##########"
      echo "#################################################################"
      set -x
      configtxgen -profile FourOrgsChannel -outputAnchorPeersUpdate \
        ${CURRENT_DIR}/channel-artifacts/$chAr -channelID $CHANNEL_NAME -asOrg $msp
      res=$?
      set +x
      if [ $res -ne 0 ]; then
        echo "Failed to generate anchor peer update for BuyerMSP..."
        exit 1
      fi
    fi
      i=$((i + 1))
  done
  echo
}

# Obtain the OS and Architecture string that will be used to select the correct
# native binaries for your platform, e.g., darwin-amd64 or linux-amd64
OS_ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')

# system channel name defaults to "byfn-sys-channel"
SYS_CHANNEL="sys-channel"
# channel name defaults to "mychannel"
CHANNEL_NAME="mychannel"

#
# use golang as the default language for chaincode
LANGUAGE=golang
# default image tag
IMAGETAG="1.4.3"
# default consensus type
CONSENSUS_TYPE="solo"
# Parse commandline args
if [ "$1" = "-m" ]; then # supports old usage, muscle memory is powerful!
  shift
fi
MODE=$1

i=0


PEERS=("$*")
for x in ${PEERS[@]}
do
    echo "${x}   --    "
done

echo "Length: ${#}"
argLen=${#}
echo "argLen: ${argLen}"
CURRENT_DIR=${PWD}

shift
# Determine whether starting, stopping, restarting, generating or upgrading
if [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and genesis block"
else
  printHelp
  exit 1
fi

while getopts "h?c:t:d:f:s:l:i:o:anv" opt; do
  case "$opt" in
  h | \?)
    printHelp
    exit 0
    ;;
  c)
    CHANNEL_NAME=$OPTARG
    ;;
  t)
    CLI_TIMEOUT=$OPTARG
    ;;
  d)
    CLI_DELAY=$OPTARG
    ;;
  f)
    COMPOSE_FILE=$OPTARG
    ;;
  s)
    IF_COUCHDB=$OPTARG
    ;;
  l)
    LANGUAGE=$OPTARG
    ;;
  i)
    IMAGETAG=$(go env GOARCH)"-"$OPTARG
    ;;
  o)
    CONSENSUS_TYPE=$OPTARG
    ;;
  a)
    CERTIFICATE_AUTHORITIES=true
    ;;
  n)
    NO_CHAINCODE=true
    ;;
  v)
    VERBOSE=true
    ;;
  esac
done

#Create the network using docker compose

if [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateCerts
  replacePrivateKey
  generateChannelArtifacts
else
  printHelp
  exit 1
fi