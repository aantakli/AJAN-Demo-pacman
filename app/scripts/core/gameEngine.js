class GameEngine {
  constructor(maxFps, uuid, entityList) {
    this.fpsDisplay = document.getElementById('fps-display');
    this.elapsedMs = 0;
    this.lastFrameTimeMs = 0;
    this.entityList = entityList;
    this.maxFps = maxFps;
    this.timestep = 1000 / this.maxFps;
    this.fps = this.maxFps;
    this.framesThisSecond = 0;
    this.lastFpsUpdate = 0;
    this.frameId = 0;
    this.running = false;
    this.started = false;
    this.uuid = uuid;
    this.currentDirection = 'up';
  }

  /**
   * Toggles the paused/running status of the game
   * @param {Boolean} running - Whether the game is currently in motion
   */
  changePausedState(running) {
    if (running) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Updates the on-screen FPS counter once per second
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  updateFpsDisplay(timestamp) {
    if (timestamp > this.lastFpsUpdate + 1000) {
      this.fps = (this.framesThisSecond + this.fps) / 2;
      this.lastFpsUpdate = timestamp;
      this.framesThisSecond = 0;
    }
    this.framesThisSecond += 1;
    this.fpsDisplay.textContent = `${Math.round(this.fps)} FPS`;
  }

  /**
   * Calls the draw function for every member of the entityList
   * @param {number} interp - The animation accuracy as a percentage
   * @param {Array} entityList - List of entities to be used throughout the game
   */
  draw(interp, entityList) {
    entityList.forEach((entity) => {
      if (typeof entity.draw === 'function') {
        entity.draw(interp);
      }
    });
  }

  /**
   * Calls the update function for every member of the entityList
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {Array} entityList - List of entities to be used throughout the game
   */
  update(elapsedMs, entityList) {
    entityList.forEach((entity) => {
      if (typeof entity.update === 'function') {
        entity.update(elapsedMs);
      }
    });
  }

  /**
   * In the event that a ton of unsimulated frames pile up, discard all of these frames
   * to prevent crashing the game
   */
  panic() {
    this.elapsedMs = 0;
  }

  /**
   * Draws an initial frame, resets a few tracking variables related to animation, and calls
   * the mainLoop function to start the engine
   */
  start() {
    if (!this.started) {
      this.started = true;

      this.frameId = requestAnimationFrame((firstTimestamp) => {
        this.draw(1, []);
        this.running = true;
        this.lastFrameTimeMs = firstTimestamp;
        this.lastFpsUpdate = firstTimestamp;
        this.framesThisSecond = 0;

        this.frameId = requestAnimationFrame((timestamp) => {
          this.mainLoop(timestamp);
        });
      });
      // this.stop();
      // eslint-disable-next-line no-unused-expressions
      this.fetchMovement(this.entityList).then(() => {
        console.log('fetchedMovement');
      });
    }
  }

  determineGridPosition(position, scaledTileSize) {
    return {
      x: (position.left / scaledTileSize) + 0.5,
      y: (position.top / scaledTileSize) + 0.5,
    };
  }

  /**
   * Fetch movement data from backend
   */
  async fetchMovement(json) {
    const payload = [];
    json.forEach((item) => {
      const payLoadItem = {};
      payLoadItem.type = item.constructor.name;
      payLoadItem.direction = item.direction;
      payLoadItem.desiredDirection = item.desiredDirection;
      payLoadItem.moving = item.moving;
      payLoadItem.position = {};
      let pos;
      try {
        pos = this.determineGridPosition(item.position, item.scaledTileSize);
        payLoadItem.position.x = item.position.left;
        payLoadItem.position.y = item.position.top;
        console.log(pos, item.position, item.scaledTileSize);
      } catch (e) {
        // eslint-disable-next-line max-len
        pos = this.determineGridPosition({ x: item.x, y: item.y }, item.scaledTileSize);
        payLoadItem.position.x = item.x;
        payLoadItem.position.y = item.y;
        payLoadItem.points = item.points;
        console.log(pos, { x: item.x, y: item.y }, item.scaledTileSize);
      }
      payLoadItem.position = pos;
      payload.push(payLoadItem);
    });
    const data = { uuid: this.uuid, data: payload };
    console.log('Sending data update', data);
    const resp = await fetch(`${(window.dataLayer[2])[1]}/update`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ContentType: 'application/json',
      },
      body: JSON.stringify(data),
    });
    const dir = (await resp.json()).direction;
    // console.log('Response from update', dir);
    if (this.currentDirection !== dir) {
      this.currentDirection = dir;
      window.dispatchEvent(new CustomEvent('changeAIDirection', {
        detail: {
          direction: this.currentDirection,
        },
      }));
    }
  }


  /**
   * Stops the engine and cancels the current animation frame
   */
  stop() {
    console.log('stop');
    this.running = false;
    this.started = false;
    cancelAnimationFrame(this.frameId);
  }

  /**
   * The loop which will process all necessary frames to update the game's entities
   * prior to animating them
   */
  processFrames() {
    let numUpdateSteps = 0;
    while (this.elapsedMs >= this.timestep) {
      this.update(this.timestep, this.entityList);
      this.elapsedMs -= this.timestep;
      numUpdateSteps += 1;
      if (numUpdateSteps >= this.maxFps) {
        this.panic();
        break;
      }
    }
  }

  /**
   * A single cycle of the engine which checks to see if enough time has passed, and, if so,
   * will kick off the loops to update and draw the game's entities.
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  engineCycle(timestamp) {
    if (timestamp < this.lastFrameTimeMs + (1000 / this.maxFps)) {
      this.frameId = requestAnimationFrame((nextTimestamp) => {
        this.mainLoop(nextTimestamp);
      });
      return;
    }

    this.elapsedMs += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;
    this.updateFpsDisplay(timestamp);
    this.processFrames();
    this.draw(this.elapsedMs / this.timestep, this.entityList);
    (async () => this.fetchMovement(this.entityList))();

    this.frameId = requestAnimationFrame((nextTimestamp) => {
      this.mainLoop(nextTimestamp);
    });
  }

  /**
   * The endless loop which will kick off engine cycles so long as the game is running
   * @param {number} timestamp - The amount of MS which has passed since starting the game engine
   */
  mainLoop(timestamp) {
    this.engineCycle(timestamp);
  }
}

// removeIf(production)
module.exports = GameEngine;
// endRemoveIf(production)
