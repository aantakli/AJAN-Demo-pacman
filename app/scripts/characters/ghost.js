class Ghost {
  constructor(scaledTileSize, mazeArray, pacman, name, characterUtil) {
    this.scaledTileSize = scaledTileSize;
    this.mazeArray = mazeArray;
    this.pacman = pacman;
    this.name = name;
    this.characterUtil = characterUtil;
    this.animationTarget = document.getElementById(name);

    this.reset();
  }

  /**
   * Rests the character to its default state
   */
  reset() {
    this.mode = 'chase';
    this.setMovementStats(this.pacman, this.name);
    this.setSpriteAnimationStats();
    this.setStyleMeasurements(this.scaledTileSize, this.spriteFrames);
    this.setDefaultPosition(this.scaledTileSize, this.name);
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Sets various properties related to the ghost's movement
   * @param {Object} pacman - Pacman's speed is used as the base for the ghosts' speeds
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   */
  setMovementStats(pacman, name) {
    const pacmanSpeed = pacman.velocityPerMs;

    this.slowSpeed = pacmanSpeed * 0.75;
    this.mediumSpeed = pacmanSpeed * 0.90;
    this.fastSpeed = pacmanSpeed * 1.05;

    this.scaredSpeed = pacmanSpeed * 0.5;
    this.transitionSpeed = pacmanSpeed * 0.4;
    this.eyeSpeed = pacmanSpeed * 2;

    this.velocityPerMs = this.slowSpeed;
    this.moving = false;

    switch (name) {
      case 'blinky':
        this.defaultDirection = this.characterUtil.directions.left;
        break;
      default:
        this.defaultDirection = this.characterUtil.directions.left;
        break;
    }
    this.direction = this.defaultDirection;
  }

  /**
   * Sets values pertaining to the ghost's spritesheet animation
   */
  setSpriteAnimationStats() {
    this.display = true;
    this.loopAnimation = true;
    this.animate = true;
    this.msBetweenSprites = 250;
    this.msSinceLastSprite = 0;
    this.spriteFrames = 2;
    this.backgroundOffsetPixels = 0;
    this.animationTarget.style.backgroundPosition = '0px 0px';
  }

  /**
   * Sets css property values for the ghost
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @param {number} spriteFrames - The number of frames in the ghost's spritesheet
   */
  setStyleMeasurements(scaledTileSize, spriteFrames) {
    // The ghosts are the size of 2x2 game tiles.
    this.measurement = scaledTileSize * 2;

    this.animationTarget.style.height = `${this.measurement}px`;
    this.animationTarget.style.width = `${this.measurement}px`;
    const bgSize = this.measurement * spriteFrames;
    this.animationTarget.style.backgroundSize = `${bgSize}px`;
  }

  /**
   * Sets the default position and direction for the ghosts at the game's start
   * @param {number} scaledTileSize - The dimensions of a single tile
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   */
  setDefaultPosition(scaledTileSize, name) {
    switch (name) {
      case 'blinky':
        this.defaultPosition = {
          top: scaledTileSize * 10.5,
          left: scaledTileSize * 13,
        };
        break;
      default:
        this.defaultPosition = {
          top: 0,
          left: 0,
        };
        break;
    }
    this.position = Object.assign({}, this.defaultPosition);
    this.oldPosition = Object.assign({}, this.position);
    this.animationTarget.style.top = `${this.position.top}px`;
    this.animationTarget.style.left = `${this.position.left}px`;
  }

  /**
   * Chooses a movement Spritesheet depending upon direction
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   */
  setSpriteSheet(name, direction, mode) {
    if (mode === 'scared') {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/scared_${this.scaredColor}.svg)`;
    } else if (mode === 'eyes') {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/eyes_${direction}.svg)`;
    } else {
      this.animationTarget.style.backgroundImage = 'url(app/style/graphics/'
        + `spriteSheets/characters/ghosts/${name}/${name}_${direction}.svg)`;
    }
  }

  /**
   * Checks to see if the ghost is currently in the 'tunnels' on the outer edges of the maze
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @returns {Boolean}
   */
  isInTunnel(gridPosition) {
    return (
      gridPosition.y === 14
      && (gridPosition.x < 6 || gridPosition.x > 21)
    );
  }

  /**
   * Checks to see if the ghost is currently in the 'Ghost House' in the center of the maze
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @returns {Boolean}
   */
  isInGhostHouse(gridPosition) {
    return (
      (gridPosition.x > 9 && gridPosition.x < 18)
      && (gridPosition.y > 11 && gridPosition.y < 17)
    );
  }

  /**
   * Checks to see if the tile at the given coordinates of the Maze is an open position
   * @param {Array} mazeArray - 2D array representing the game board
   * @param {number} y - The target row
   * @param {number} x - The target column
   * @returns {(false | { x: number, y: number})} - x-y pair if the tile is free, false otherwise
   */
  getTile(mazeArray, y, x) {
    let tile = false;

    if (mazeArray[y] && mazeArray[y][x] && mazeArray[y][x] !== 'X') {
      tile = {
        x,
        y,
      };
    }

    return tile;
  }

  /**
   * Returns a list of all of the possible moves for the ghost to make on the next turn
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {Array} mazeArray - 2D array representing the game board
   * @returns {object}
   */
  determinePossibleMoves(gridPosition, direction, mazeArray) {
    const { x, y } = gridPosition;

    const possibleMoves = {
      up: this.getTile(mazeArray, y - 1, x),
      down: this.getTile(mazeArray, y + 1, x),
      left: this.getTile(mazeArray, y, x - 1),
      right: this.getTile(mazeArray, y, x + 1),
    };

    // Ghosts are not allowed to turn around at crossroads
    possibleMoves[this.characterUtil.getOppositeDirection(direction)] = false;

    Object.keys(possibleMoves).forEach((tile) => {
      if (possibleMoves[tile] === false) {
        delete possibleMoves[tile];
      }
    });

    return possibleMoves;
  }

  /**
   * Uses the Pythagorean Theorem to measure the distance between a given postion and Pacman
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacman - Pacman's current x-y position on the 2D Maze Array
   * @returns {number}
   */
  calculateDistance(position, pacman) {
    return Math.sqrt(
      ((position.x - pacman.x) ** 2) + ((position.y - pacman.y) ** 2),
    );
  }

  /**
   * Determines the appropriate target for the ghost's AI
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {({x: number, y: number})}
   */
  getTarget(name, pacmanGridPosition, mode) {
    // Ghosts return to the ghost-house after eaten
    if (mode === 'eyes') {
      return { x: 13.5, y: 10 };
    }

    // Ghosts run from Pacman if scared
    if (mode === 'scared') {
      return pacmanGridPosition;
    }

    switch (name) {
      // Blinky goes after Pacman's position
      case 'blinky':
        return pacmanGridPosition;
      default:
        // TODO: Other ghosts
        return pacmanGridPosition;
    }
  }

  /**
   * Calls the appropriate function to determine the best move depending on the ghost's name
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {Object} possibleMoves - All of the moves the ghost could choose to make this turn
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {('up'|'down'|'left'|'right')}
   */
  determineBestMove(name, possibleMoves, pacmanGridPosition, mode) {
    let bestDistance = (mode === 'scared') ? 0 : Infinity;
    let bestMove;
    const target = this.getTarget(name, pacmanGridPosition, mode);

    Object.keys(possibleMoves).forEach((move) => {
      const distance = this.calculateDistance(
        possibleMoves[move], target,
      );
      const betterMove = (mode === 'scared')
        ? (distance > bestDistance)
        : (distance < bestDistance);

      if (betterMove) {
        bestDistance = distance;
        bestMove = move;
      }
    });

    return bestMove;
  }

  /**
   * Determines the best direction for the ghost to travel in during the current frame
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {({x: number, y: number})} gridPosition - The current x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @param {('up'|'down'|'left'|'right')} direction - The character's current travel orientation
   * @param {Array} mazeArray - 2D array representing the game board
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {('up'|'down'|'left'|'right')}
   */
  determineDirection(
    name, gridPosition, pacmanGridPosition, direction, mazeArray, mode,
  ) {
    let newDirection = direction;
    const possibleMoves = this.determinePossibleMoves(
      gridPosition, direction, mazeArray,
    );

    if (Object.keys(possibleMoves).length === 1) {
      [newDirection] = Object.keys(possibleMoves);
    } else if (Object.keys(possibleMoves).length > 1) {
      newDirection = this.determineBestMove(
        name, possibleMoves, pacmanGridPosition, mode,
      );
    }

    return newDirection;
  }

  /**
   * Handle the ghost's movement when it is snapped to the x-y grid of the Maze Array
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} velocity - The distance the character should travel in a single millisecond
   * @param {({x: number, y: number})} pacmanGridPosition - x-y position on the 2D Maze Array
   * @returns {({ top: number, left: number})}
   */
  handleSnappedMovement(elapsedMs, gridPosition, velocity, pacmanGridPosition) {
    const newPosition = Object.assign({}, this.position);

    this.direction = this.determineDirection(
      this.name, gridPosition, pacmanGridPosition, this.direction,
      this.mazeArray, this.mode,
    );
    this.setSpriteSheet(this.name, this.direction, this.mode);
    newPosition[this.characterUtil.getPropertyToChange(this.direction)]
      += this.characterUtil.getVelocity(this.direction, velocity) * elapsedMs;

    return newPosition;
  }

  /**
   * Determines if an eaten ghost is at the entrance of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  enteringGhostHouse(mode, position) {
    return (
      mode === 'eyes'
      && position.y === 11
      && (position.x > 13.4 && position.x < 13.6)
    );
  }

  /**
   * Determines if an eaten ghost has reached the center of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  enteredGhostHouse(mode, position) {
    return (
      mode === 'eyes'
      && position.x === 13.5
      && (position.y > 13.8 && position.y < 14.2)
    );
  }

  /**
   * Determines if a restored ghost is at the exit of the Ghost House
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @param {({x: number, y: number})} position - x-y position during the current frame
   * @returns {Boolean}
   */
  leavingGhostHouse(mode, position) {
    return (
      mode !== 'eyes'
      && position.x === 13.5
      && (position.y > 10.8 && position.y < 11)
    );
  }

  /**
   * Handles entering and leaving the Ghost House after a ghost is eaten
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @returns {({x: number, y: number})}
   */
  handleGhostHouse(gridPosition) {
    const gridPositionCopy = Object.assign({}, gridPosition);

    if (this.enteringGhostHouse(this.mode, gridPosition)) {
      this.direction = this.characterUtil.directions.down;
      gridPositionCopy.x = 13.5;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
    }

    if (this.enteredGhostHouse(this.mode, gridPosition)) {
      this.direction = this.characterUtil.directions.up;
      gridPositionCopy.y = 14;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
      // TODO: Ask if this should be chase or scatter mode
      this.mode = 'chase';
    }

    if (this.leavingGhostHouse(this.mode, gridPosition)) {
      gridPositionCopy.y = 11;
      this.position = this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
      this.direction = this.characterUtil.directions.left;
    }

    return gridPositionCopy;
  }

  /**
   * Handle the ghost's movement when it is inbetween tiles on the x-y grid of the Maze Array
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   * @param {({x: number, y: number})} gridPosition - x-y position during the current frame
   * @param {number} velocity - The distance the character should travel in a single millisecond
   * @returns {({ top: number, left: number})}
   */
  handleUnsnappedMovement(elapsedMs, gridPosition, velocity) {
    const gridPositionCopy = this.handleGhostHouse(gridPosition);

    const desired = this.characterUtil.determineNewPositions(
      this.position, this.direction, velocity, elapsedMs, this.scaledTileSize,
    );

    if (this.characterUtil.changingGridPosition(
      gridPositionCopy, desired.newGridPosition,
    )) {
      return this.characterUtil.snapToGrid(
        gridPositionCopy, this.direction, this.scaledTileSize,
      );
    }

    return desired.newPosition;
  }

  /**
   * Toggles a scared ghost between blue and white, then updates its spritsheet
   */
  toggleScaredColor() {
    this.scaredColor = (this.scaredColor === 'blue')
      ? 'white' : 'blue';
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Sets the ghost's mode to SCARED, turns the ghost around,
   * and changes spritesheets accordingly
   */
  becomeScared() {
    const gridPosition = this.characterUtil.determineGridPosition(
      this.position, this.scaledTileSize,
    );

    if (this.mode !== 'eyes') {
      if (!this.isInGhostHouse(gridPosition) && this.mode !== 'scared') {
        this.direction = this.characterUtil.getOppositeDirection(
          this.direction,
        );
      }
      this.mode = 'scared';
      this.scaredColor = 'blue';
      this.setSpriteSheet(this.name, this.direction, this.mode);
    }
  }

  /**
   * Returns the scared ghost to chase/scatter mode and sets its spritesheet
   */
  endScared() {
    // TODO: Ask if this should be chase or scatter mode
    this.mode = 'chase';
    this.setSpriteSheet(this.name, this.direction, this.mode);
  }

  /**
   * Checks if the ghost contacts Pacman - starts the death sequence if so
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {({x: number, y: number})} pacman - Pacman's current x-y position on the 2D Maze Array
   */
  checkCollision(position, pacman) {
    if (this.calculateDistance(position, pacman) < 1 && this.mode !== 'eyes') {
      if (this.mode === 'scared') {
        window.dispatchEvent(new CustomEvent('eatGhost', {
          detail: {
            ghost: this,
          },
        }));
        this.mode = 'eyes';
      } else {
        window.dispatchEvent(new Event('deathSequence'));
      }
    }
  }

  /**
   * Determines the appropriate speed for the ghost
   * @param {('inky'|'blinky'|'pinky'|'clyde')} name - The name of the current ghost
   * @param {({x: number, y: number})} position - An x-y position on the 2D Maze Array
   * @param {('chase'|'scatter'|'scared'|'eyes')} mode - The character's behavior mode
   * @returns {number}
   */
  determineVelocity(name, position, mode) {
    if (mode === 'eyes') {
      return this.eyeSpeed;
    } if (this.isInTunnel(position) || this.isInGhostHouse(position)) {
      return this.transitionSpeed;
    } if (mode === 'scared') {
      return this.scaredSpeed;
    }
    if (name === 'blinky') {
      // TODO: Logic for blinky's speed based on remaining pac-dots
      return this.slowSpeed;
    }
    return this.slowSpeed;
  }

  /**
   * Updates the css position, hides if there is a stutter, and animates the spritesheet
   * @param {number} interp - The animation accuracy as a percentage
   */
  draw(interp) {
    const newTop = this.characterUtil.calculateNewDrawValue(
      interp, 'top', this.oldPosition, this.position,
    );
    const newLeft = this.characterUtil.calculateNewDrawValue(
      interp, 'left', this.oldPosition, this.position,
    );
    this.animationTarget.style.top = `${newTop}px`;
    this.animationTarget.style.left = `${newLeft}px`;

    this.animationTarget.style.visibility = this.display
      ? this.characterUtil.checkForStutter(this.position, this.oldPosition)
      : 'hidden';

    const updatedProperties = this.characterUtil.advanceSpriteSheet(this);
    this.msSinceLastSprite = updatedProperties.msSinceLastSprite;
    this.animationTarget = updatedProperties.animationTarget;
    this.backgroundOffsetPixels = updatedProperties.backgroundOffsetPixels;
  }

  /**
   * Handles movement logic for the ghost
   * @param {number} elapsedMs - The amount of MS that have passed since the last update
   */
  update(elapsedMs) {
    this.oldPosition = Object.assign({}, this.position);

    if (this.pacman.moving) {
      this.moving = true;
    }

    if (this.moving) {
      const gridPosition = this.characterUtil.determineGridPosition(
        this.position, this.scaledTileSize,
      );
      const pacmanGridPosition = this.characterUtil.determineGridPosition(
        this.pacman.position, this.scaledTileSize,
      );
      const velocity = this.determineVelocity(
        this.name, gridPosition, this.mode,
      );

      if (JSON.stringify(this.position) === JSON.stringify(
        this.characterUtil.snapToGrid(
          gridPosition, this.direction, this.scaledTileSize,
        ),
      )) {
        this.position = this.handleSnappedMovement(
          elapsedMs, gridPosition, velocity, pacmanGridPosition,
        );
      } else {
        this.position = this.handleUnsnappedMovement(
          elapsedMs, gridPosition, velocity,
        );
      }

      this.position = this.characterUtil.handleWarp(
        this.position, this.scaledTileSize, this.mazeArray,
      );

      this.checkCollision(gridPosition, pacmanGridPosition);

      this.msSinceLastSprite += elapsedMs;
    }
  }
}

// removeIf(production)
module.exports = Ghost;
// endRemoveIf(production)