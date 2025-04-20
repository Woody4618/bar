/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/let_me_pay.json`.
 */
export type LetMePay = {
  "address": "barqFQ2m1YsNTQwfj3hnEN7svuppTa6V2hKAHPpBiX9",
  "metadata": {
    "name": "letMePay",
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
                "path": "storeName"
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
          "name": "mint"
        }
      ],
      "args": [
        {
          "name": "storeName",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deleteProduct",
      "discriminator": [
        173,
        212,
        141,
        230,
        33,
        82,
        166,
        25
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
                "path": "storeName"
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
          "name": "storeName",
          "type": "string"
        },
        {
          "name": "productName",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteStore",
      "discriminator": [
        150,
        83,
        75,
        192,
        195,
        29,
        178,
        183
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
                "path": "storeName"
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
          "name": "storeName",
          "type": "string"
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
                "path": "storeName"
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
          "name": "storeName",
          "type": "string"
        }
      ]
    },
    {
      "name": "makePurchase",
      "discriminator": [
        193,
        62,
        227,
        136,
        105,
        212,
        201,
        20
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
                "path": "storeName"
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
          "name": "storeName",
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
      "name": "markAsDelivered",
      "discriminator": [
        112,
        46,
        230,
        68,
        152,
        97,
        194,
        62
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
                "path": "storeName"
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
          "name": "storeName",
          "type": "string"
        },
        {
          "name": "receiptId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateTelegramChannel",
      "discriminator": [
        125,
        26,
        242,
        114,
        17,
        12,
        103,
        200
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
                "path": "storeName"
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
          "name": "storeName",
          "type": "string"
        },
        {
          "name": "telegramChannelId",
          "type": "string"
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
  "events": [
    {
      "name": "purchaseMade",
      "discriminator": [
        73,
        37,
        99,
        22,
        201,
        228,
        56,
        21
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
    },
    {
      "code": 6005,
      "name": "storeNotEmpty",
      "msg": "storeNotEmpty"
    },
    {
      "code": 6006,
      "name": "productNameEmpty",
      "msg": "productNameEmpty"
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
      "name": "purchaseMade",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "productName",
            "type": "string"
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
            "name": "receiptId",
            "type": "u64"
          },
          {
            "name": "telegramChannelId",
            "type": "string"
          },
          {
            "name": "storeName",
            "type": "string"
          },
          {
            "name": "receiptsAccount",
            "type": "pubkey"
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
            "name": "totalPurchases",
            "type": "u64"
          },
          {
            "name": "storeName",
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
          },
          {
            "name": "telegramChannelId",
            "type": "string"
          }
        ]
      }
    }
  ]
};
