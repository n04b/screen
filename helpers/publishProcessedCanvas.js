const cookBitmap = require("./cookBitmap");

const targetScreenDefaultSettings = {
  bytesPerPixel: 3,
  segmentSize: 8,
  segmentsOrder: [2, 3, 0, 1]
};

module.exports = (
  config,
  mqttClient,
  screen,
  targetScreenSettings = targetScreenDefaultSettings
) => {
  const { screenWidth, screenHeight, mqttRootTopic, screenMqttTopic } = config;
  const { bytesPerPixel, segmentSize, segmentsOrder } = targetScreenSettings;

  mqttClient.publish(
    `${mqttRootTopic}/canvasProcessed`,
    cookBitmap(
      screen.bitmap,
      segmentSize,
      bytesPerPixel,
      screenWidth,
      screenHeight,
      segmentsOrder
    )
  );

  if (screenMqttTopic) {
    mqttClient.publish(
      screenMqttTopic,
      cookBitmap(
        screen.bitmap,
        segmentSize,
        bytesPerPixel,
        screenWidth,
        screenHeight,
        segmentsOrder
      )
    );
  }
};

/*
  QUESTIONS:
  - стоит ли передавать инстанс в функцию? наверное нет)
  - и вообще как мне правильно абстрагировать это? выносить
    в отдельную функцию? 
  - и (!) как это вообще вписать эту фичу в функционал,
    когда, вроде как он не должен быть встроенным. хм...
 */
