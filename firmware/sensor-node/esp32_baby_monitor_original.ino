#include <WiFi.h>
#include "AdafruitIO_WiFi.h"
#include "DHT.h"

/********* Adafruit IO Credentials *********/
#define IO_USERNAME  "YOUR_ADAFRUIT_USERNAME"
#define IO_KEY       "YOUR_ADAFRUIT_IO_KEY"

/********* WiFi Credentials *********/
#define WIFI_SSID    "YOUR_WIFI_NAME"
#define WIFI_PASS    "YOUR_WIFI_PASSWORD"

/********* Pin Definitions *********/
#define DHTPIN 4
#define DHTTYPE DHT11
#define PIR_PIN 27
#define SOUND_PIN 34
#define GAS_PIN 35
#define MOISTURE_PIN 32
#define BUZZER_PIN 26

AdafruitIO_WiFi io(IO_USERNAME, IO_KEY, WIFI_SSID, WIFI_PASS);

AdafruitIO_Feed *tempFeed     = io.feed("baby-temperature");
AdafruitIO_Feed *humidityFeed = io.feed("baby-humidity");
AdafruitIO_Feed *motionFeed   = io.feed("baby-motion");
AdafruitIO_Feed *soundFeed    = io.feed("baby-sound");
AdafruitIO_Feed *gasFeed      = io.feed("baby-gas");
AdafruitIO_Feed *moistureFeed = io.feed("baby-moisture");
AdafruitIO_Feed *alertFeed    = io.feed("baby-alert");

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  dht.begin();

  io.connect();
  while(io.status() < AIO_CONNECTED) {
    delay(500);
  }
}

void loop() {
  io.run();

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int motion = digitalRead(PIR_PIN);
  int soundVal = analogRead(SOUND_PIN);
  int gasVal = analogRead(GAS_PIN);
  int moistVal = analogRead(MOISTURE_PIN);

  tempFeed->save(temp);
  humidityFeed->save(hum);
  motionFeed->save(motion);
  soundFeed->save(soundVal);
  gasFeed->save(gasVal);
  moistureFeed->save(moistVal);

  if(temp > 37.5 || soundVal > 600 || gasVal > 500 || moistVal < 1500) {
    alertFeed->save("Baby Alert Detected");
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(5000);
}
