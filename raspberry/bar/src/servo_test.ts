const Gpio = require("pigpio").Gpio;

// Configure the servo on GPIO pin 18 (you can change this pin number if needed)
const servo = new Gpio(14, { mode: Gpio.OUTPUT });

// Define servo positions in microseconds (PWM pulse width)
const NEUTRAL_POSITION = 1500; // Servo at rest - no button press
const PRESS_POSITION = 2000; // Servo position for button press

// Function to perform a single button press
async function pressButton() {
  try {
    // Start from neutral position
    servo.servoWrite(NEUTRAL_POSITION);
    console.log("Servo in neutral position");

    // Wait a moment to ensure servo is stable
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Press the button
    console.log("Pressing button...");
    servo.servoWrite(PRESS_POSITION);

    // Hold for 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Return to neutral position
    console.log("Releasing button...");
    servo.servoWrite(NEUTRAL_POSITION);
  } catch (error) {
    console.error("Error during button press:", error);
  }
}

// Initialize servo to neutral position
servo.servoWrite(NEUTRAL_POSITION);
console.log("Servo initialized to neutral position");

// Function to repeatedly press the button every 5 seconds
async function runLoop() {
  while (true) {
    await pressButton();
    console.log("Button press completed, waiting 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\nExiting...");
  servo.servoWrite(NEUTRAL_POSITION);
  process.exit();
});

// Start the loop
runLoop();
