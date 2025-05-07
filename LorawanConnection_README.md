### Setup LubeCell HTCC-AB02S LoraWan

## Install Arduino IDE

https://www.arduino.cc/en/software

Add the following boards to the arduino ide under prefenrences :

https://resource.heltec.cn/download/package_CubeCell_index.json

Select CubeCell from the board manager and install its drivers.
Select LubeCell HTCC-AB02S from the CubeCell list.

```cpp
#define LED 2

void setup() {
  pinMode(LED, OUTPUT);

}

void loop() {
  digitalWrite(LED, HIGH);
  delay(1000);
  digitalWrite(LED, LOW);
  delay(1000);
}
```

Click verify and then upload.

Create an account in thethings.network. Create a new application and then a new device.

Copy the devicename and appname and paste it in the code below:
Pick your region. You can ask chatGPT to help you figure out the correct entries.

This is how you can print out the devicename and appname and appkey:

```cpp
#include "LoRaWan_APP.h"

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("JoinEUI (AppEUI):");
  printJoinEui();
  Serial.println("DevEUI:");
  printDevEui();
  Serial.println("AppKey:");
  printAppKey();  // Optional — used in OTAA
}

void loop() {
  // Nothing needed here
}
```
