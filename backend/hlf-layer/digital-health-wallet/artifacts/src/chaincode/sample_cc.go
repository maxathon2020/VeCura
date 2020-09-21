package main

import (
	"bytes"
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type digital_health_wallet struct {
}

// ============================================================================================================================
// Main
// ============================================================================================================================
func main() {
	err := shim.Start(new(digital_health_wallet))
	if err != nil {
		fmt.Printf("Error starting chaincode: %s", err)
	}

}

// ============================================================================================================================
// Init - reset all the things
// ============================================================================================================================
func (t *digital_health_wallet) Init(APIstub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

// ============================================================================================================================
// Invoke - Our entry point for Invocations
// ============================================================================================================================
func (t *digital_health_wallet) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Println("function is ==> :" + function)
	action := args[0]
	fmt.Println(" action is ==> :" + action)
	fmt.Println(args)

	if action == "dummy" {
		return t.dummy(stub, args)
	}
	fmt.Println("invoke did not find func: " + action) //error

	return shim.Error("Received unknown function")
}

// queryAsset Function gets the assets based on Id provided as input
func (t *digital_health_wallet) dummy(APIstub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments, Required 2")
	}

	fmt.Println("In Query Asset")
	var buffer bytes.Buffer
	buffer.WriteString("Successful!")
	return shim.Success(buffer.Bytes())
}
