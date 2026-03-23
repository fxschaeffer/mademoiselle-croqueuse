// ============================================================
// Pac-Man Maze Generator
// Adapted from Shaun LeBron's pacman-mazegen (MIT License)
// https://shaunlebron.github.io/pacman-mazegen/
//
// Generates random 28x31 mazes compatible with our game format:
// 0=path, 1=wall, 2=dot, 3=power pellet, 4=ghost house, 5=ghost door
// ============================================================

var MazeGen = (function() {
  "use strict";

  var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  var shuffle = function(list) {
    var len = list.length;
    for (var i = 0; i < len; i++) {
      var j = getRandomInt(0, len - 1);
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
  };

  var randomElement = function(list) {
    if (list.length > 0) {
      return list[getRandomInt(0, list.length - 1)];
    }
  };

  var UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;

  var cells, tallRows, narrowCols;
  var rows = 9, cols = 5;

  var reset = function() {
    cells = [];
    tallRows = [];
    narrowCols = [];

    for (var i = 0; i < rows * cols; i++) {
      cells[i] = {
        x: i % cols,
        y: Math.floor(i / cols),
        filled: false,
        connect: [false, false, false, false],
        next: [],
        no: undefined,
        group: undefined,
      };
    }

    for (var i = 0; i < rows * cols; i++) {
      var c = cells[i];
      if (c.x > 0) c.next[LEFT] = cells[i - 1];
      if (c.x < cols - 1) c.next[RIGHT] = cells[i + 1];
      if (c.y > 0) c.next[UP] = cells[i - cols];
      if (c.y < rows - 1) c.next[DOWN] = cells[i + cols];
    }

    // Ghost home (rows 3-4, cols 0-1)
    var i = 3 * cols;
    var c = cells[i];
    c.filled = true;
    c.connect[LEFT] = c.connect[RIGHT] = c.connect[DOWN] = true;

    i++;
    c = cells[i];
    c.filled = true;
    c.connect[LEFT] = c.connect[DOWN] = true;

    i += cols - 1;
    c = cells[i];
    c.filled = true;
    c.connect[LEFT] = c.connect[UP] = c.connect[RIGHT] = true;

    i++;
    c = cells[i];
    c.filled = true;
    c.connect[UP] = c.connect[LEFT] = true;
  };

  var genRandom = function() {

    var getLeftMostEmptyCells = function() {
      var leftCells = [];
      for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
          var c = cells[x + y * cols];
          if (!c.filled) leftCells.push(c);
        }
        if (leftCells.length > 0) break;
      }
      return leftCells;
    };

    var isOpenCell = function(cell, i, prevDir, size) {
      if (cell.y == 6 && cell.x == 0 && i == DOWN ||
          cell.y == 7 && cell.x == 0 && i == UP) return false;
      if (size == 2 && (i == prevDir || (i + 2) % 4 == prevDir)) return false;
      if (cell.next[i] && !cell.next[i].filled) {
        if (cell.next[i].next[LEFT] && !cell.next[i].next[LEFT].filled) {}
        else return true;
      }
      return false;
    };

    var getOpenCells = function(cell, prevDir, size) {
      var openCells = [];
      for (var i = 0; i < 4; i++) {
        if (isOpenCell(cell, i, prevDir, size)) openCells.push(i);
      }
      return { openCells: openCells, numOpenCells: openCells.length };
    };

    var connectCell = function(cell, dir) {
      cell.connect[dir] = true;
      cell.next[dir].connect[(dir + 2) % 4] = true;
      if (cell.x == 0 && dir == RIGHT) cell.connect[LEFT] = true;
    };

    var gen = function() {
      var cell, newCell, firstCell;
      var openCells, numOpenCells;
      var dir, i;
      var numFilled = 0, numGroups, size;
      var probStopGrowingAtSize = [0, 0, 0.10, 0.5, 0.75, 1];

      var singleCount = {};
      singleCount[0] = singleCount[rows - 1] = 0;

      var longPieces = 0;
      var maxLongPieces = 1;

      var fillCell = function(cell) {
        cell.filled = true;
        cell.no = numFilled++;
        cell.group = numGroups;
      };

      for (numGroups = 0; ; numGroups++) {
        openCells = getLeftMostEmptyCells();
        numOpenCells = openCells.length;
        if (numOpenCells == 0) break;

        firstCell = cell = openCells[getRandomInt(0, numOpenCells - 1)];
        fillCell(cell);

        if (cell.x < cols - 1 && (cell.y in singleCount) && Math.random() <= 0.35) {
          if (singleCount[cell.y] == 0) {
            cell.connect[cell.y == 0 ? UP : DOWN] = true;
            singleCount[cell.y]++;
            continue;
          }
        }

        size = 1;

        if (cell.x == cols - 1) {
          cell.connect[RIGHT] = true;
          cell.isRaiseHeightCandidate = true;
        } else {
          while (size < 5) {
            var stop = false;

            if (size == 2) {
              var c = firstCell;
              if (c.x > 0 && c.connect[RIGHT] && c.next[RIGHT] && c.next[RIGHT].next[RIGHT]) {
                if (longPieces < maxLongPieces && Math.random() <= 1) {
                  c = c.next[RIGHT].next[RIGHT];
                  var dirs = {};
                  if (isOpenCell(c, UP)) dirs[UP] = true;
                  if (isOpenCell(c, DOWN)) dirs[DOWN] = true;

                  if (dirs[UP] && dirs[DOWN]) i = [UP, DOWN][getRandomInt(0, 1)];
                  else if (dirs[UP]) i = UP;
                  else if (dirs[DOWN]) i = DOWN;
                  else i = undefined;

                  if (i != undefined) {
                    connectCell(c, LEFT);
                    fillCell(c);
                    connectCell(c, i);
                    fillCell(c.next[i]);
                    longPieces++;
                    size += 2;
                    stop = true;
                  }
                }
              }
            }

            if (!stop) {
              var result = getOpenCells(cell, dir, size);
              openCells = result.openCells;
              numOpenCells = result.numOpenCells;

              if (numOpenCells == 0 && size == 2) {
                cell = newCell;
                result = getOpenCells(cell, dir, size);
                openCells = result.openCells;
                numOpenCells = result.numOpenCells;
              }

              if (numOpenCells == 0) {
                stop = true;
              } else {
                dir = openCells[getRandomInt(0, numOpenCells - 1)];
                newCell = cell.next[dir];
                connectCell(cell, dir);
                fillCell(newCell);
                size++;
                if (firstCell.x == 0 && size == 3) stop = true;
                if (Math.random() <= probStopGrowingAtSize[size]) stop = true;
              }
            }

            if (stop) {
              if (size == 2) {
                var c = firstCell;
                if (c.x == cols - 1) {
                  if (c.connect[UP]) c = c.next[UP];
                  c.connect[RIGHT] = c.next[DOWN].connect[RIGHT] = true;
                }
              } else if (size == 3 || size == 4) {
                if (longPieces < maxLongPieces && firstCell.x > 0 && Math.random() <= 0.5) {
                  var dirs = [];
                  for (i = 0; i < 4; i++) {
                    if (cell.connect[i] && isOpenCell(cell.next[i], i)) {
                      dirs.push(i);
                    }
                  }
                  if (dirs.length > 0) {
                    i = dirs[getRandomInt(0, dirs.length - 1)];
                    var c = cell.next[i];
                    connectCell(c, i);
                    fillCell(c.next[i]);
                    longPieces++;
                  }
                }
              }
              break;
            }
          }
        }
      }
      setResizeCandidates();
    };

    var setResizeCandidates = function() {
      for (var i = 0; i < rows * cols; i++) {
        var c = cells[i];
        var q = c.connect;

        if ((c.x == 0 || !q[LEFT]) && (c.x == cols - 1 || !q[RIGHT]) && q[UP] != q[DOWN]) {
          c.isRaiseHeightCandidate = true;
        }

        var c2 = c.next[RIGHT];
        if (c2 != undefined) {
          var q2 = c2.connect;
          if (((c.x == 0 || !q[LEFT]) && !q[UP] && !q[DOWN]) &&
              ((c2.x == cols - 1 || !q2[RIGHT]) && !q2[UP] && !q2[DOWN])) {
            c.isRaiseHeightCandidate = c2.isRaiseHeightCandidate = true;
          }
        }

        if (c.x == cols - 1 && q[RIGHT]) c.isShrinkWidthCandidate = true;
        if ((c.y == 0 || !q[UP]) && (c.y == rows - 1 || !q[DOWN]) && q[LEFT] != q[RIGHT]) {
          c.isShrinkWidthCandidate = true;
        }
      }
    };

    var cellIsCrossCenter = function(c) {
      return c.connect[UP] && c.connect[RIGHT] && c.connect[DOWN] && c.connect[LEFT];
    };

    var chooseNarrowCols = function() {
      var canShrinkWidth = function(x, y) {
        if (y == rows - 1) return true;
        var x0, c, c2;
        for (x0 = x; x0 < cols; x0++) {
          c = cells[x0 + y * cols];
          c2 = c.next[DOWN];
          if ((!c.connect[RIGHT] || cellIsCrossCenter(c)) &&
              (!c2.connect[RIGHT] || cellIsCrossCenter(c2))) break;
        }

        var candidates = [];
        for (; c2; c2 = c2.next[LEFT]) {
          if (c2.isShrinkWidthCandidate) candidates.push(c2);
          if ((!c2.connect[LEFT] || cellIsCrossCenter(c2)) &&
              (!c2.next[UP].connect[LEFT] || cellIsCrossCenter(c2.next[UP]))) break;
        }
        shuffle(candidates);

        for (var i = 0; i < candidates.length; i++) {
          c2 = candidates[i];
          if (canShrinkWidth(c2.x, c2.y)) {
            c2.shrinkWidth = true;
            narrowCols[c2.y] = c2.x;
            return true;
          }
        }
        return false;
      };

      for (var x = cols - 1; x >= 0; x--) {
        var c = cells[x];
        if (c.isShrinkWidthCandidate && canShrinkWidth(x, 0)) {
          c.shrinkWidth = true;
          narrowCols[c.y] = c.x;
          return true;
        }
      }
      return false;
    };

    var chooseTallRows = function() {
      var canRaiseHeight = function(x, y) {
        if (x == cols - 1) return true;
        var y0, c, c2;
        for (y0 = y; y0 >= 0; y0--) {
          c = cells[x + y0 * cols];
          c2 = c.next[RIGHT];
          if ((!c.connect[UP] || cellIsCrossCenter(c)) &&
              (!c2.connect[UP] || cellIsCrossCenter(c2))) break;
        }

        var candidates = [];
        for (; c2; c2 = c2.next[DOWN]) {
          if (c2.isRaiseHeightCandidate) candidates.push(c2);
          if ((!c2.connect[DOWN] || cellIsCrossCenter(c2)) &&
              (!c2.next[LEFT].connect[DOWN] || cellIsCrossCenter(c2.next[LEFT]))) break;
        }
        shuffle(candidates);

        for (var i = 0; i < candidates.length; i++) {
          c2 = candidates[i];
          if (canRaiseHeight(c2.x, c2.y)) {
            c2.raiseHeight = true;
            tallRows[c2.x] = c2.y;
            return true;
          }
        }
        return false;
      };

      for (var y = 0; y < 3; y++) {
        var c = cells[y * cols];
        if (c.isRaiseHeightCandidate && canRaiseHeight(0, y)) {
          c.raiseHeight = true;
          tallRows[c.x] = c.y;
          return true;
        }
      }
      return false;
    };

    var isDesirable = function() {
      var c = cells[4];
      if (c.connect[UP] || c.connect[RIGHT]) return false;
      c = cells[rows * cols - 1];
      if (c.connect[DOWN] || c.connect[RIGHT]) return false;

      var isHori = function(x, y) {
        var q1 = cells[x + y * cols].connect;
        var q2 = cells[x + 1 + y * cols].connect;
        return !q1[UP] && !q1[DOWN] && (x == 0 || !q1[LEFT]) && q1[RIGHT] &&
               !q2[UP] && !q2[DOWN] && q2[LEFT] && !q2[RIGHT];
      };
      var isVert = function(x, y) {
        var q1 = cells[x + y * cols].connect;
        var q2 = cells[x + (y + 1) * cols].connect;
        if (x == cols - 1) {
          return !q1[LEFT] && !q1[UP] && !q1[DOWN] &&
                 !q2[LEFT] && !q2[UP] && !q2[DOWN];
        }
        return !q1[LEFT] && !q1[RIGHT] && !q1[UP] && q1[DOWN] &&
               !q2[LEFT] && !q2[RIGHT] && q2[UP] && !q2[DOWN];
      };

      for (var y = 0; y < rows - 1; y++) {
        for (var x = 0; x < cols - 1; x++) {
          if (isHori(x, y) && isHori(x, y + 1) || isVert(x, y) && isVert(x + 1, y)) {
            if (x == 0) return false;
            var g = cells[x + y * cols].group;
            cells[x + y * cols].connect[DOWN] = true;
            cells[x + y * cols].connect[RIGHT] = true;
            cells[x + 1 + y * cols].connect[DOWN] = true;
            cells[x + 1 + y * cols].connect[LEFT] = true;
            cells[x + 1 + y * cols].group = g;
            cells[x + (y + 1) * cols].connect[UP] = true;
            cells[x + (y + 1) * cols].connect[RIGHT] = true;
            cells[x + (y + 1) * cols].group = g;
            cells[x + 1 + (y + 1) * cols].connect[UP] = true;
            cells[x + 1 + (y + 1) * cols].connect[LEFT] = true;
            cells[x + 1 + (y + 1) * cols].group = g;
          }
        }
      }

      if (!chooseTallRows()) return false;
      if (!chooseNarrowCols()) return false;
      return true;
    };

    var setUpScaleCoords = function() {
      for (var i = 0; i < rows * cols; i++) {
        var c = cells[i];
        c.final_x = c.x * 3;
        if (narrowCols[c.y] < c.x) c.final_x--;
        c.final_y = c.y * 3;
        if (tallRows[c.x] < c.y) c.final_y++;
        c.final_w = c.shrinkWidth ? 2 : 3;
        c.final_h = c.raiseHeight ? 4 : 3;
      }
    };

    var createTunnels = function() {
      var singleDeadEndCells = [], topSingleDeadEndCells = [], botSingleDeadEndCells = [];
      var voidTunnelCells = [], topVoidTunnelCells = [], botVoidTunnelCells = [];
      var edgeTunnelCells = [], topEdgeTunnelCells = [], botEdgeTunnelCells = [];
      var doubleDeadEndCells = [];

      for (var y = 0; y < rows; y++) {
        var c = cells[cols - 1 + y * cols];
        if (c.connect[UP]) continue;
        if (c.y > 1 && c.y < rows - 2) {
          c.isEdgeTunnelCandidate = true;
          edgeTunnelCells.push(c);
          if (c.y <= 2) topEdgeTunnelCells.push(c);
          else if (c.y >= 5) botEdgeTunnelCells.push(c);
        }
        var upDead = (!c.next[UP] || c.next[UP].connect[RIGHT]);
        var downDead = (!c.next[DOWN] || c.next[DOWN].connect[RIGHT]);
        if (c.connect[RIGHT]) {
          if (upDead) {
            c.isVoidTunnelCandidate = true;
            voidTunnelCells.push(c);
            if (c.y <= 2) topVoidTunnelCells.push(c);
            else if (c.y >= 6) botVoidTunnelCells.push(c);
          }
        } else {
          if (c.connect[DOWN]) continue;
          if (upDead != downDead) {
            if (!c.raiseHeight && y < rows - 1 && !c.next[LEFT].connect[LEFT]) {
              singleDeadEndCells.push(c);
              c.isSingleDeadEndCandidate = true;
              c.singleDeadEndDir = upDead ? UP : DOWN;
              var offset = upDead ? 1 : 0;
              if (c.y <= 1 + offset) topSingleDeadEndCells.push(c);
              else if (c.y >= 5 + offset) botSingleDeadEndCells.push(c);
            }
          } else if (upDead && downDead) {
            if (y > 0 && y < rows - 1) {
              if (c.next[LEFT].connect[UP] && c.next[LEFT].connect[DOWN]) {
                c.isDoubleDeadEndCandidate = true;
                if (c.y >= 2 && c.y <= 5) doubleDeadEndCells.push(c);
              }
            }
          }
        }
      }

      var numTunnelsDesired = Math.random() <= 0.45 ? 2 : 1;
      var c;
      var selectSingleDeadEnd = function(c) {
        c.connect[RIGHT] = true;
        if (c.singleDeadEndDir == UP) c.topTunnel = true;
        else c.next[DOWN].topTunnel = true;
      };

      if (numTunnelsDesired == 1) {
        if (c = randomElement(voidTunnelCells)) c.topTunnel = true;
        else if (c = randomElement(singleDeadEndCells)) selectSingleDeadEnd(c);
        else if (c = randomElement(edgeTunnelCells)) c.topTunnel = true;
        else return false;
      } else {
        if (c = randomElement(doubleDeadEndCells)) {
          c.connect[RIGHT] = true;
          c.topTunnel = true;
          c.next[DOWN].topTunnel = true;
        } else {
          var found = 0;
          if (c = randomElement(topVoidTunnelCells)) { c.topTunnel = true; found++; }
          else if (c = randomElement(topSingleDeadEndCells)) { selectSingleDeadEnd(c); found++; }
          else if (c = randomElement(topEdgeTunnelCells)) { c.topTunnel = true; found++; }

          if (c = randomElement(botVoidTunnelCells)) { c.topTunnel = true; found++; }
          else if (c = randomElement(botSingleDeadEndCells)) { selectSingleDeadEnd(c); found++; }
          else if (c = randomElement(botEdgeTunnelCells)) { c.topTunnel = true; found++; }

          if (found == 0) return false;
        }
      }

      // Don't allow horizontal path to cut straight through
      for (var y = 0; y < rows; y++) {
        c = cells[cols - 1 + y * cols];
        if (c.topTunnel) {
          var exit = true;
          var topy = c.final_y;
          var tc = c;
          while (tc.next[LEFT]) {
            tc = tc.next[LEFT];
            if (!tc.connect[UP] && tc.final_y == topy) continue;
            else { exit = false; break; }
          }
          if (exit) return false;
        }
      }

      // Clear unused void tunnels
      var replaceGroup = function(oldg, newg) {
        for (var i = 0; i < rows * cols; i++) {
          if (cells[i].group == oldg) cells[i].group = newg;
        }
      };
      for (var i = 0; i < voidTunnelCells.length; i++) {
        c = voidTunnelCells[i];
        if (!c.topTunnel) {
          replaceGroup(c.group, c.next[UP].group);
          c.connect[UP] = true;
          c.next[UP].connect[DOWN] = true;
        }
      }

      return true;
    };

    var joinWalls = function() {
      var x, y, c;

      for (x = 0; x < cols; x++) {
        c = cells[x];
        if (!c.connect[LEFT] && !c.connect[RIGHT] && !c.connect[UP] &&
            (!c.connect[DOWN] || !c.next[DOWN].connect[DOWN])) {
          if ((!c.next[LEFT] || !c.next[LEFT].connect[UP]) &&
              (c.next[RIGHT] && !c.next[RIGHT].connect[UP])) {
            if (!(c.next[DOWN] && c.next[DOWN].connect[RIGHT] && c.next[DOWN].next[RIGHT].connect[RIGHT])) {
              c.isJoinCandidate = true;
              if (Math.random() <= 0.25) c.connect[UP] = true;
            }
          }
        }
      }

      for (x = 0; x < cols; x++) {
        c = cells[x + (rows - 1) * cols];
        if (!c.connect[LEFT] && !c.connect[RIGHT] && !c.connect[DOWN] &&
            (!c.connect[UP] || !c.next[UP].connect[UP])) {
          if ((!c.next[LEFT] || !c.next[LEFT].connect[DOWN]) &&
              (c.next[RIGHT] && !c.next[RIGHT].connect[DOWN])) {
            if (!(c.next[UP] && c.next[UP].connect[RIGHT] && c.next[UP].next[RIGHT].connect[RIGHT])) {
              c.isJoinCandidate = true;
              if (Math.random() <= 0.25) c.connect[DOWN] = true;
            }
          }
        }
      }

      for (y = 1; y < rows - 1; y++) {
        c = cells[cols - 1 + y * cols];
        if (c.raiseHeight) continue;
        if (!c.connect[RIGHT] && !c.connect[UP] && !c.connect[DOWN] &&
            !c.next[UP].connect[RIGHT] && !c.next[DOWN].connect[RIGHT]) {
          if (c.connect[LEFT]) {
            var c2 = c.next[LEFT];
            if (!c2.connect[UP] && !c2.connect[DOWN] && !c2.connect[LEFT]) {
              c.isJoinCandidate = true;
              if (Math.random() <= 0.5) c.connect[RIGHT] = true;
            }
          }
        }
      }
    };

    // Try to generate valid map
    var maxAttempts = 1000;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      reset();
      gen();
      if (!isDesirable()) continue;
      setUpScaleCoords();
      joinWalls();
      if (!createTunnels()) continue;
      return true;
    }
    return false;
  };

  // Convert cells to tile string
  var getTiles = function() {
    var tiles = [];
    var tileCells = [];
    var subrows = rows * 3 + 1 + 3;
    var subcols = cols * 3 - 1 + 2;
    var midcols = subcols - 2;
    var fullcols = (subcols - 2) * 2;

    var setTile = function(x, y, v) {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return;
      x -= 2;
      tiles[midcols + x + y * fullcols] = v;
      tiles[midcols - 1 - x + y * fullcols] = v;
    };
    var getTile = function(x, y) {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return undefined;
      x -= 2;
      return tiles[midcols + x + y * fullcols];
    };

    var setTileCell = function(x, y, cell) {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return;
      x -= 2;
      tileCells[x + y * subcols] = cell;
    };
    var getTileCell = function(x, y) {
      if (x < 0 || x > subcols - 1 || y < 0 || y > subrows - 1) return undefined;
      x -= 2;
      return tileCells[x + y * subcols];
    };

    for (var i = 0; i < subrows * fullcols; i++) tiles.push('_');
    for (var i = 0; i < subrows * subcols; i++) tileCells.push(undefined);

    // Set tile cells
    for (var i = 0; i < rows * cols; i++) {
      var c = cells[i];
      for (var x0 = 0; x0 < c.final_w; x0++) {
        for (var y0 = 0; y0 < c.final_h; y0++) {
          setTileCell(c.final_x + x0, c.final_y + 1 + y0, c);
        }
      }
    }

    // Set path tiles
    for (var y = 0; y < subrows; y++) {
      for (var x = 0; x < subcols; x++) {
        var c = getTileCell(x, y);
        var cl = getTileCell(x - 1, y);
        var cu = getTileCell(x, y - 1);

        if (c) {
          if (cl && c.group != cl.group || cu && c.group != cu.group || !cu && !c.connect[UP]) {
            setTile(x, y, '.');
          }
        } else {
          if (cl && (!cl.connect[RIGHT] || getTile(x - 1, y) == '.') ||
              cu && (!cu.connect[DOWN] || getTile(x, y - 1) == '.')) {
            setTile(x, y, '.');
          }
        }

        if (getTile(x - 1, y) == '.' && getTile(x, y - 1) == '.' && getTile(x - 1, y - 1) == '_') {
          setTile(x, y, '.');
        }
      }
    }

    // Extend tunnels
    for (var c = cells[cols - 1]; c; c = c.next[DOWN]) {
      if (c.topTunnel) {
        var y = c.final_y + 1;
        setTile(subcols - 1, y, '.');
        setTile(subcols - 2, y, '.');
      }
    }

    // Fill in walls
    for (var y = 0; y < subrows; y++) {
      for (var x = 0; x < subcols; x++) {
        if (getTile(x, y) != '.' &&
            (getTile(x - 1, y) == '.' || getTile(x, y - 1) == '.' || getTile(x + 1, y) == '.' ||
             getTile(x, y + 1) == '.' || getTile(x - 1, y - 1) == '.' || getTile(x + 1, y - 1) == '.' ||
             getTile(x + 1, y + 1) == '.' || getTile(x - 1, y + 1) == '.')) {
          setTile(x, y, '|');
        }
      }
    }

    // Ghost door
    setTile(2, 12, '-');

    // Set energizers
    var getTopEnergizerRange = function() {
      var miny, maxy = subrows / 2;
      var x = subcols - 2;
      for (var y = 2; y < maxy; y++) {
        if (getTile(x, y) == '.' && getTile(x, y + 1) == '.') { miny = y + 1; break; }
      }
      if (!miny) return null;
      maxy = Math.min(maxy, miny + 7);
      for (var y = miny + 1; y < maxy; y++) {
        if (getTile(x - 1, y) == '.') { maxy = y - 1; break; }
      }
      return { miny: miny, maxy: maxy };
    };

    var getBotEnergizerRange = function() {
      var miny = subrows / 2, maxy;
      var x = subcols - 2;
      for (var y = subrows - 3; y >= miny; y--) {
        if (getTile(x, y) == '.' && getTile(x, y + 1) == '.') { maxy = y; break; }
      }
      if (!maxy) return null;
      miny = Math.max(miny, maxy - 7);
      for (var y = maxy - 1; y > miny; y--) {
        if (getTile(x - 1, y) == '.') { miny = y + 1; break; }
      }
      return { miny: miny, maxy: maxy };
    };

    var x = subcols - 2;
    var range;
    if (range = getTopEnergizerRange()) setTile(x, getRandomInt(range.miny, range.maxy), 'o');
    if (range = getBotEnergizerRange()) setTile(x, getRandomInt(range.miny, range.maxy), 'o');

    // Erase pellets in tunnels
    var eraseUntilIntersection = function(x, y) {
      while (true) {
        var adj = [];
        if (getTile(x - 1, y) == '.') adj.push({ x: x - 1, y: y });
        if (getTile(x + 1, y) == '.') adj.push({ x: x + 1, y: y });
        if (getTile(x, y - 1) == '.') adj.push({ x: x, y: y - 1 });
        if (getTile(x, y + 1) == '.') adj.push({ x: x, y: y + 1 });
        if (adj.length == 1) { setTile(x, y, ' '); x = adj[0].x; y = adj[0].y; }
        else break;
      }
    };
    x = subcols - 1;
    for (var y = 0; y < subrows; y++) {
      if (getTile(x, y) == '.') eraseUntilIntersection(x, y);
    }

    // Erase pellets on starting position
    setTile(1, subrows - 8, ' ');

    // Erase pellets around ghost house
    for (var i = 0; i < 7; i++) {
      var y = subrows - 14;
      setTile(i, y, ' ');
      var j = 1;
      while (getTile(i, y + j) == '.' && getTile(i - 1, y + j) == '|' && getTile(i + 1, y + j) == '|') {
        setTile(i, y + j, ' '); j++;
      }
      y = subrows - 20;
      setTile(i, y, ' ');
      j = 1;
      while (getTile(i, y - j) == '.' && getTile(i - 1, y - j) == '|' && getTile(i + 1, y - j) == '|') {
        setTile(i, y - j, ' '); j++;
      }
    }
    for (var i = 0; i < 7; i++) {
      x = 6;
      var y = subrows - 14 - i;
      setTile(x, y, ' ');
      var j = 1;
      while (getTile(x + j, y) == '.' && getTile(x + j, y - 1) == '|' && getTile(x + j, y + 1) == '|') {
        setTile(x + j, y, ' '); j++;
      }
    }

    // Build tile string with padding
    return (
      "____________________________" +
      "____________________________" +
      "____________________________" +
      tiles.join("") +
      "____________________________" +
      "____________________________");
  };

  // Convert tile string to our 28x31 game format
  var tilesToGameGrid = function(tileStr) {
    // The tile string is 28 wide x 36 tall (with 3 empty rows on top, 2 on bottom)
    // We need 28x31 for our game
    var fullWidth = 28;
    var fullHeight = 36;
    var grid = [];

    for (var r = 0; r < 31; r++) {
      var row = [];
      for (var c = 0; c < 28; c++) {
        var idx = (r + 3) * fullWidth + c; // skip 3 top padding rows
        var ch = tileStr[idx] || '_';

        switch (ch) {
          case '.': row.push(2); break;  // dot
          case 'o': row.push(3); break;  // power pellet
          case '|': row.push(1); break;  // wall
          case '-': row.push(5); break;  // ghost door
          case ' ': row.push(0); break;  // path (no dot)
          case '_': row.push(1); break;  // blank = wall
          default:  row.push(1); break;
        }
      }
      grid.push(row);
    }

    // Fix ghost house interior
    // Find all ghost door tiles (type 5) to locate the ghost house
    var doorRow = -1, doorColLeft = -1, doorColRight = -1;
    for (var r = 8; r < 20; r++) {
      for (var c = 0; c < 28; c++) {
        if (grid[r][c] === 5) {
          doorRow = r;
          if (doorColLeft < 0) doorColLeft = c;
          doorColRight = c;
        }
      }
      if (doorRow >= 0) break;
    }

    if (doorRow >= 0) {
      var doorCenter = Math.floor((doorColLeft + doorColRight) / 2);

      // Flood fill from below the door to find the ghost house interior
      // The GH is enclosed by walls (type 1) and door (type 5)
      var ghInterior = [];
      var visited = {};
      var queue = [];

      // The ghost house in Shaun LeBron's format is a solid block of walls
      // with a door (--) on top. We need to carve out the interior.
      // The GH box is: door on top, walls all around, ~8 wide x ~5 tall
      // The door is at doorRow, cols doorColLeft-doorColRight
      // The GH extends ~3 rows below door, and ~2 cols wider than door on each side

      // Find the ghost house rectangle by looking at the wall block below the door
      // The GH walls typically span from doorCol-3 to doorCol+4, doorRow to doorRow+4
      var ghCenterCol = Math.floor((doorColLeft + doorColRight) / 2);

      // The GH interior is the 6x3 area inside the box walls
      // Door row = top, interior is rows doorRow+1 to doorRow+3
      // Interior cols = doorColLeft-1 to doorColRight+1 (inside the side walls)
      var ghInteriorTop = doorRow + 1;
      var ghInteriorBot = doorRow + 3;
      // The GH box walls are typically 2 cols wider than the door on each side
      var ghInteriorLeft = doorColLeft - 2;
      var ghInteriorRight = doorColRight + 2;

      // Mark interior as type 4 (overwrite walls)
      for (var r = ghInteriorTop; r <= ghInteriorBot && r < 31; r++) {
        for (var c = ghInteriorLeft; c <= ghInteriorRight && c < 28; c++) {
          if (c >= 0) {
            grid[r][c] = 4;
          }
        }
      }
    }

    // Find player spawn - look for a path tile near row 23, col 14
    var spawnRow = -1, spawnCol = 14;
    // Search downward from row 20 for a path tile near the center
    for (var r = 20; r < 29; r++) {
      for (var dc = 0; dc < 5; dc++) {
        var c1 = 14 + dc, c2 = 14 - dc;
        if (c1 < 28 && (grid[r][c1] === 0 || grid[r][c1] === 2)) {
          spawnRow = r; spawnCol = c1; break;
        }
        if (c2 >= 0 && (grid[r][c2] === 0 || grid[r][c2] === 2)) {
          spawnRow = r; spawnCol = c2; break;
        }
      }
      if (spawnRow >= 0) break;
    }
    if (spawnRow < 0) { spawnRow = 23; spawnCol = 14; }

    return {
      grid: grid,
      spawnRow: spawnRow,
      spawnCol: spawnCol,
      doorRow: doorRow,
      doorCol: doorColLeft >= 0 ? Math.floor((doorColLeft + doorColRight) / 2) : 13
    };
  };

  // Public API
  return {
    generate: function() {
      var success = genRandom();
      if (!success) return null;
      var tileStr = getTiles();
      return tilesToGameGrid(tileStr);
    },

    // Generate and return raw tile string (for debugging)
    generateRaw: function() {
      var success = genRandom();
      if (!success) return null;
      return getTiles();
    }
  };

})();

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MazeGen;
}
