import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate"
import { GasPrice } from "@cosmjs/stargate"
import { DirectSecp256k1HdWallet, EncodeObject } from "@cosmjs/proto-signing"
import { LedgerSigner } from "@cosmjs/ledger-amino"
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx"
import { toUtf8 } from "@cosmjs/encoding"
import { getSigner, getLedgerSigner } from "./wallet"

const IS_TESTNET = !process.argv.includes("--mainnet")

const JUNO_MAINNET_RPC = "https://rpc.juno-1.deuslabs.fi"
const JUNO_TESTNET_RPC = "https://rpc.uni.juno.deuslabs.fi"

const MNEMONIC =
  "anger ivory inside rocket reopen long flee jump elite wear negative distance income involve lobster boil panel champion reflect horse dial lion doctor prosper"

const CONTRACT_ADDRESS =
  "juno1p4x3dcr6q5ekcp2z28a522zxf7wnkczhtaejh6t5tr3rr9pxlrtq6308a5"

let signer: DirectSecp256k1HdWallet | LedgerSigner
let client: SigningCosmWasmClient

const querySmartContract = async (message: Record<string, unknown>) => {
  client.queryContractSmart(CONTRACT_ADDRESS, message)
}

const main = async () => {
  /* SIGNER INIT */
  if (process.argv.includes("--ledger")) signer = await getLedgerSigner()
  else signer = await getSigner(MNEMONIC)

  /* CLIENT INIT */
  client = await SigningCosmWasmClient.connectWithSigner(
    IS_TESTNET ? JUNO_TESTNET_RPC : JUNO_MAINNET_RPC,
    signer,
    {
      prefix: "juno",
      gasPrice: GasPrice.fromString("0.0025ujunox"),
    }
  )

  /* ACCOUNT */
  const account = (await signer.getAccounts())[0]
  console.log(account)

  /* QUERY */
  const queryMessage = {
    minter: {},
  }
  const queryResponse = await querySmartContract(queryMessage)
  console.log(queryResponse)

  /* TRANSACTION */
  const txMessage = {
    mint: {
      token_id: "some_id",
      owner: account.address,
    },
  }

  /* SIGN AND BROADCAST */
  const signAndBroadcastMessage: EncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender: account.address,
      contract: CONTRACT_ADDRESS,
      msg: toUtf8(JSON.stringify(txMessage)),
    }),
  }
  const signAndBroadcastResponse = await client.signAndBroadcast(
    account.address,
    [signAndBroadcastMessage],
    "auto"
  )
  console.log(signAndBroadcastResponse)

  /* EXECUTE */
  const executeResponse = await client.execute(
    account.address,
    CONTRACT_ADDRESS,
    txMessage,
    "auto"
  )
  console.log(executeResponse)
}

main()
