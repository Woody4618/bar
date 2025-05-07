### Setup LubeCell HTCC-AB02S LoraWan

## Install Arduino IDE

https://www.arduino.cc/en/software

Add the following boards to the arduino ide under preferences :

https://resource.heltec.cn/download/package_CubeCell_index.json

Select CubeCell from the board manager and install its drivers.
Select LubeCell HTCC-AB02S from the CubeCell list.

Try a quick LED example to see if the board is working:

```cpp
#include "LoRaWan_APP.h"  // Must be first
#include "HT_SSD1306Wire.h"
#include "CubeCell_NeoPixel.h"

extern SSD1306Wire display;
extern CubeCell_NeoPixel pixels;  // ← FIX: use the existing object

void setup() {
  // Start the display
  display.init();
  display.clear();
  display.setFont(ArialMT_Plain_16);
  display.drawString(0, 0, "Hello LoRaWan! ");
  display.drawString(0, 20, "(hi @helium) ");
  display.display();

  // Power on the RGB LED
  pinMode(Vext, OUTPUT);
  digitalWrite(Vext, LOW); // Enable 3.3V for peripherals

  // Start RGB pixel (already declared)
  pixels.begin();
  pixels.clear();

  // Setup GPIO2 for BONK LED or output
  pinMode(GPIO2, OUTPUT);
  digitalWrite(GPIO2, HIGH);
  delay(200);
}

uint8_t i = 0;

void loop() {
  // BONK pulse
  digitalWrite(GPIO2, HIGH);
  delay(200);
  digitalWrite(GPIO2, LOW);
  delay(200);

  // RGB cycle
  pixels.setPixelColor(0, pixels.Color(i, 0, 0));
  pixels.show();
  delay(200);

  pixels.setPixelColor(0, pixels.Color(0, i, 0));
  pixels.show();
  delay(200);

  pixels.setPixelColor(0, pixels.Color(0, 0, i));
  pixels.show();
  delay(200);

  i += 10;
}
```

Click verify and then upload.

Create an account in [thethings.network](https://www.thethingsnetwork.org/). Create a new application and then a new device.
Setup your device in the [TheThingsConsole](https://eu1.cloud.thethings.network/console/) (This one is for Europe, pick your region).

Copy the devicename and appname and paste it in the code below.

Here is a working code example to connects to the things network and can be used to start a pump when you send a downlink to the device via the things network we console. You can just then "01" ay bytes. I did not build a final version of this because the Lorawan connection was not stable enough in my home. If you could make this work would be awesome. Lorawan would be a great solution for this project. You can also configure a webhook in the console that triggers the downlink when a new receipts is created!

```cpp
#include "LoRaWan_APP.h"
#include "Arduino.h"
#include "HT_SSD1306Wire.h"
#include "CubeCell_NeoPixel.h"

extern SSD1306Wire display;
extern CubeCell_NeoPixel pixels;  // ← FIX: use the existing object

/*
 * set LoraWan_RGB to Active,the RGB active in loraWan
 * RGB red means sending;
 * RGB purple means joined done;
 * RGB blue means RxWindow1;
 * RGB yellow means RxWindow2;
 * RGB green means received done;
 */

/* OTAA para*/
uint8_t devEui[] = { 0x70, 0xB3, 0xD5, 0x7E, 0xD0, 0x07, 0x01, 0xB8 };
uint8_t appEui[] = { 0x70, 0xB3, 0xD5, 0x7E, 0xD0, 0x03, 0x7C, 0x0A };
uint8_t appKey[] = { 0xED, 0xFC, 0x03, 0x1D, 0x56, 0x04, 0xFE, 0x15, 0x4D, 0xDB, 0x01, 0x4D, 0x21, 0x66, 0x88, 0x91 };

/* ABP para*/
uint8_t nwkSKey[] = { 0x13, 0x9B, 0x18, 0x47, 0x29, 0xA4, 0x88, 0x95, 0x3A, 0xC0, 0x82, 0xF7, 0x85, 0x34, 0x98, 0x24 };
uint8_t appSKey[] = { 0xFE, 0xB6, 0x1A, 0x5C, 0x23, 0xA1, 0x44, 0xA1, 0xDE, 0xA3, 0x91, 0xCE, 0x93, 0x4B, 0x63, 0xFA };
uint32_t devAddr =  ( uint32_t )0x007e6ae1;

/*LoraWan channelsmask*/
uint16_t userChannelsMask[6]={ 0x00FF,0x0000,0x0000,0x0000,0x0000,0x0000 };

/*LoraWan region, select in arduino IDE tools*/
LoRaMacRegion_t loraWanRegion = ACTIVE_REGION;

/*LoraWan Class, Class A and Class C are supported*/
DeviceClass_t  loraWanClass = LORAWAN_CLASS;

/*the application data transmission duty cycle.  value in [ms].*/
uint32_t appTxDutyCycle = 15000;

/*OTAA or ABP*/
bool overTheAirActivation = LORAWAN_NETMODE;

/*ADR enable*/
bool loraWanAdr = LORAWAN_ADR;

/* set LORAWAN_Net_Reserve ON, the node could save the network info to flash, when node reset not need to join again */
bool keepNet = LORAWAN_NET_RESERVE;

/* Indicates if the node is sending confirmed or unconfirmed messages */
bool isTxConfirmed = LORAWAN_UPLINKMODE;

/* Application port */
uint8_t appPort = 2;
/*!
* Number of trials to transmit the frame, if the LoRaMAC layer did not
* receive an acknowledgment. The MAC performs a datarate adaptation,
* according to the LoRaWAN Specification V1.0.2, chapter 18.4, according
* to the following table:
*
* Transmission nb | Data Rate
* ----------------|-----------
* 1 (first)       | DR
* 2               | DR
* 3               | max(DR-1,0)
* 4               | max(DR-1,0)
* 5               | max(DR-2,0)
* 6               | max(DR-2,0)
* 7               | max(DR-3,0)
* 8               | max(DR-3,0)
*
* Note, that if NbTrials is set to 1 or 2, the MAC will not decrease
* the datarate, in case the LoRaMAC layer did not receive an acknowledgment
*/
uint8_t confirmedNbTrials = 4;

/* Prepares the payload of the frame */
static void prepareTxFrame( uint8_t port )
{
	/*appData size is LORAWAN_APP_DATA_MAX_SIZE which is defined in "commissioning.h".
	*appDataSize max value is LORAWAN_APP_DATA_MAX_SIZE.
	*if enabled AT, don't modify LORAWAN_APP_DATA_MAX_SIZE, it may cause system hanging or failure.
	*if disabled AT, LORAWAN_APP_DATA_MAX_SIZE can be modified, the max value is reference to lorawan region and SF.
	*for example, if use REGION_CN470,
	*the max value for different DR can be found in MaxPayloadOfDatarateCN470 refer to DataratesCN470 and BandwidthsCN470 in "RegionCN470.h".
	*/
    appDataSize = 4;
    appData[0] = 0x00;
    appData[1] = 0x01;
    appData[2] = 0x02;
    appData[3] = 0x03;
}


void setup() {
	Serial.begin(115200);

#if(AT_SUPPORT)
	enableAt();
#endif
  LoRaWAN.displayMcuInit();
	deviceState = DEVICE_STATE_INIT;

	 LoRaWAN.ifskipjoin();
	// if (keepNet) {
  // LoRaWAN.restore();
  // if (LoRaWAN.isJoined()) {
  //   Serial.println("Restored session from flash.");
  //   deviceState = DEVICE_STATE_SEND;
  //   return;
  // }
//}
}

void loop()
{
	switch( deviceState )
	{
		case DEVICE_STATE_INIT:
		{
#if(LORAWAN_DEVEUI_AUTO)
			LoRaWAN.generateDeveuiByChipID();
#endif
#if(AT_SUPPORT)
			getDevParam();
#endif
			printDevParam();
			LoRaWAN.init(loraWanClass,loraWanRegion);
			deviceState = DEVICE_STATE_JOIN;
			break;
		}
		case DEVICE_STATE_JOIN:
		{
      LoRaWAN.displayJoining();
			LoRaWAN.join();
			break;
		}
		case DEVICE_STATE_SEND:
		{
      LoRaWAN.displaySending();
			prepareTxFrame( appPort );
			LoRaWAN.send();
			deviceState = DEVICE_STATE_CYCLE;
			break;
		}
		case DEVICE_STATE_CYCLE:
		{
			// Schedule next packet transmission
			txDutyCycleTime = appTxDutyCycle + randr( 0, APP_TX_DUTYCYCLE_RND );
			LoRaWAN.cycle(txDutyCycleTime);
			deviceState = DEVICE_STATE_SLEEP;
			break;
		}
		case DEVICE_STATE_SLEEP:
		{
      LoRaWAN.displayAck();
			LoRaWAN.sleep();
			break;
		}
		default:
		{
			deviceState = DEVICE_STATE_INIT;
			break;
		}
	}
}

// This runs whenever a downlink arrives!
void downLinkDataHandle(McpsIndication_t *mcpsIndication)
{
  Serial.printf("Received downlink: PORT %d, SIZE %d, DATA: ",
      mcpsIndication->Port, mcpsIndication->BufferSize);

  for (uint8_t i = 0; i < mcpsIndication->BufferSize; i++) {
    Serial.printf("%02X", mcpsIndication->Buffer[i]);
  }
  Serial.println();

  // === Trigger pour sequence if first byte == 0x01 ===
  //if (mcpsIndication->BufferSize >= 1 && mcpsIndication->Buffer[0] == 0x01) {
    // Flash RGB LED
    for (int i = 0; i < 5; i++) {
      pixels.setPixelColor(0, pixels.Color(0, 150, 0));  // Green
      pixels.show();
      delay(200);
      pixels.clear();
      pixels.show();
      delay(200);
    }

    // Show "POURING..." on OLED
    display.clear();
    display.setFont(ArialMT_Plain_16);
    display.drawString(0, 0, "POURING...");
    display.display();
    delay(2000);

    display.clear();
    display.drawString(0, 0, "Bar Ready");
    display.display();
  //}
}

```
