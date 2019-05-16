const cookBitmap = require("./cookBitmap");

module.exports = (config, mqttClient, screen) => {
  const {screenWidth, screenHeight, screenMqttTopic} = config;
  const bytesPerPixel = 3;
  const segmentSize = 8;
  const segmentsOrder = [2, 3, 0, 1];  

  mqttClient.publish(
    `${config.mqttRootTopic}/canvasProcessed`,
    cookBitmap(
      screen.bitmap,
      segmentSize,
      bytesPerPixel,
      screenWidth,
      screenHeight,
      segmentsOrder
    )
  );

  if(screenMqttTopic) {
    mqttClient.publish(
      `${config.mqttRootTopic}/canvasProcessed`,
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
}

/*
  QUESTIONS:
  - стоит ли передавать инстанс в функцию? наверное нет)
  - и вообще как мне правильно абстрагировать это? выносить
    в отдельную функцию? 
  - и (!) как это вообще вписать эту фичу в функционал
    когда вроде как он не должен быть встроенным
 */