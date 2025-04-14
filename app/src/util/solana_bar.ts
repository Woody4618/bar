/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_bar.json`.
 */
export type SolanaBar = {
  "address": "barqFQ2m1YsNTQwfj3hnEN7svuppTa6V2hKAHPpBiX9",
  "metadata": {
    "name": "solanaBar",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Buy shots with Solana Pay"
  },
  "instructions": [
    {
      "name": "addProduct",
      "discriminator": [
        0,
        219,
        137,
        36,
        105,
        180,
        164,
        93
      ],
      "accounts": [
        {
          "name": "receipts",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "barName"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "barName",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "mint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "buyShot",
      "discriminator": [
        136,
        77,
        215,
        171,
        61,
        106,
        54,
        119
      ],
      "accounts": [
        {
          "name": "receipts",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "barName"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "barName",
          "type": "string"
        },
        {
          "name": "productName",
          "type": "string"
        },
        {
          "name": "tableNumber",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "receipts",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "barName"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "barName",
          "type": "string"
        }
      ]
    },
    {
      "name": "markShotAsDelivered",
      "discriminator": [
        128,
        250,
        184,
        11,
        161,
        248,
        146,
        60
      ],
      "accounts": [
        {
          "name": "receipts",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "barName"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "barName",
          "type": "string"
        },
        {
          "name": "recipeId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "receipts",
      "discriminator": [
        222,
        245,
        237,
        64,
        59,
        49,
        29,
        246
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTreasury",
      "msg": "invalidTreasury"
    },
    {
      "code": 6001,
      "name": "productAlreadyExists",
      "msg": "productAlreadyExists"
    },
    {
      "code": 6002,
      "name": "productNotFound",
      "msg": "productNotFound"
    },
    {
      "code": 6003,
      "name": "invalidMint",
      "msg": "invalidMint"
    },
    {
      "code": 6004,
      "name": "invalidAuthority",
      "msg": "invalidAuthority"
    }
  ],
  "types": [
    {
      "name": "products",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "receipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receiptId",
            "type": "u64"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "wasDelivered",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "tableNumber",
            "type": "u8"
          },
          {
            "name": "productName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "receipts",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receipts",
            "type": {
              "vec": {
                "defined": {
                  "name": "receipt"
                }
              }
            }
          },
          {
            "name": "totalShotsSold",
            "type": "u64"
          },
          {
            "name": "barName",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "products",
            "type": {
              "vec": {
                "defined": {
                  "name": "products"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
