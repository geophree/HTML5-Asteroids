// Canvas Asteroids
//
// Copyright (c) 2010 Doug McInnes
//
import { startHost } from 'https://geophree.github.io/web-gamepad/host.js';

var KEY_CODES = {
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    70: 'f',
    71: 'g',
    72: 'h',
    77: 'm',
    80: 'p'
};

const KEY_STATUS = {keyDown: false};
for (const code in KEY_CODES) {
    KEY_STATUS[KEY_CODES[code]] = false;
}

window.addEventListener("keydown", (e) => {
    KEY_STATUS.keyDown = true;
    if (KEY_CODES[e.keyCode]) {
        e.preventDefault();
        KEY_STATUS[KEY_CODES[e.keyCode]] = true;
    }
});
window.addEventListener("keyup", (e) => {
    KEY_STATUS.keyDown = false;
    if (KEY_CODES[e.keyCode]) {
        e.preventDefault();
        KEY_STATUS[KEY_CODES[e.keyCode]] = false;
    }
});

const GRID_SIZE = 60;

const Matrix = function (rows, columns) {
    var i, j;
    this.data = new Array(rows);
    for (i = 0; i < rows; i++) {
        this.data[i] = new Array(columns);
    }

    this.configure = function (rot, scale, transx, transy) {
        var rad = (rot * Math.PI) / 180;
        var sin = Math.sin(rad) * scale;
        var cos = Math.cos(rad) * scale;
        this.set(cos, -sin, transx,
            sin, cos, transy);
    };

    this.set = function () {
        var k = 0;
        for (i = 0; i < rows; i++) {
            for (j = 0; j < columns; j++) {
                this.data[i][j] = arguments[k];
                k++;
            }
        }
    }

    this.multiply = function () {
        var vector = new Array(rows);
        for (i = 0; i < rows; i++) {
            vector[i] = 0;
            for (j = 0; j < columns; j++) {
                vector[i] += this.data[i][j] * arguments[j];
            }
        }
        return vector;
    };
};

const Sprite = function () {
    this.init = function (name, points, color) {
        if (color != null) {
            this.color = color;
        }
        this.name = name;
        this.points = points;

        this.vel = {
            x: 0,
            y: 0,
            rot: 0
        };

        this.acc = {
            x: 0,
            y: 0,
            rot: 0
        };
    };

    this.children = {};
    this.color = '#ffffff';

    this.visible = false;
    this.reap = false;
    this.bridgesH = true;
    this.bridgesV = true;

    this.collidesWith = [];

    this.x = 0;
    this.y = 0;
    this.rot = 0;
    this.scale = 1;

    this.currentNode = null;
    this.nextSprite = null;

    this.preMove = null;
    this.postMove = null;

    this.run = function (delta) {
        this.move(delta);
        this.updateGrid();

        var canidates = this.findCollisionCanidates();

        this.matrix.configure(this.rot, this.scale, this.x, this.y);
        const _draw = () => {
          this.context.save();
          this.configureTransform();
          this.draw();
          this.checkCollisionsAgainst(canidates);
          this.context.restore();
        };
        _draw();

        if (this.bridgesH && this.currentNode && this.currentNode.dupe.horizontal) {
            this.x += this.currentNode.dupe.horizontal;
            _draw();
            if (this.currentNode) {
                this.x -= this.currentNode.dupe.horizontal;
            }
        }
        if (this.bridgesV && this.currentNode && this.currentNode.dupe.vertical) {
            this.y += this.currentNode.dupe.vertical;
            _draw();
            if (this.currentNode) {
                this.y -= this.currentNode.dupe.vertical;
            }
        }
        if (this.bridgesH && this.bridgesV &&
            this.currentNode &&
            this.currentNode.dupe.vertical &&
            this.currentNode.dupe.horizontal) {
            this.x += this.currentNode.dupe.horizontal;
            this.y += this.currentNode.dupe.vertical;
            _draw();
            if (this.currentNode) {
                this.x -= this.currentNode.dupe.horizontal;
                this.y -= this.currentNode.dupe.vertical;
            }
        }
    };
    this.move = function (delta) {
        if (!this.visible) return;
        this.transPoints = null; // clear cached points

        if (this.preMove) {
            this.preMove(delta);
        }

        this.vel.x += this.acc.x * delta;
        this.vel.y += this.acc.y * delta;
        this.x += this.vel.x * delta;
        this.y += this.vel.y * delta;
        this.rot += this.vel.rot * delta;
        if (this.rot > 360) {
            this.rot -= 360;
        } else if (this.rot < 0) {
            this.rot += 360;
        }

        if (this.postMove) {
            this.postMove(delta);
        }
    };
    this.updateGrid = function () {
        if (!this.visible) return;
        var gridx = Math.floor(this.x / GRID_SIZE);
        var gridy = Math.floor(this.y / GRID_SIZE);
        gridx = (gridx >= this.grid.length) ? 0 : gridx;
        gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
        gridx = (gridx < 0) ? this.grid.length - 1 : gridx;
        gridy = (gridy < 0) ? this.grid[0].length - 1 : gridy;
        var newNode = this.grid[gridx][gridy];
        if (newNode != this.currentNode) {
            if (this.currentNode) {
                this.currentNode.leave(this);
            }
            newNode.enter(this);
            this.currentNode = newNode;
        }

        if (KEY_STATUS.g && this.currentNode) {
            this.context.lineWidth = 3.0;
            this.context.strokeStyle = 'green';
            this.context.strokeRect(gridx * GRID_SIZE + 2, gridy * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            this.context.strokeStyle = 'white';
            this.context.lineWidth = 1.0;
        }
    };
    this.configureTransform = function () {
        if (!this.visible) return;

        var rad = (this.rot * Math.PI) / 180;

        this.context.translate(this.x, this.y);
        this.context.rotate(rad);
        this.context.scale(this.scale, this.scale);
    };
    this.draw = function () {
        if (!this.visible) return;

        this.context.lineWidth = 3.0 / this.scale;

        for (const child in this.children) {
            this.children[child].draw();
        }

        this.context.beginPath();
        this.context.strokeStyle = '#ffffff';

        this.context.moveTo(this.points[0], this.points[1]);
        for (var i = 1; i < this.points.length / 2; i++) {
            var xi = i * 2;
            var yi = xi + 1;
            this.context.lineTo(this.points[xi], this.points[yi]);
        }

        this.context.closePath();
        this.context.stroke();
        this.context.fillStyle = this.color;
        this.context.fill();
    };
    this.findCollisionCanidates = function () {
        if (!this.visible || !this.currentNode) return [];
        var cn = this.currentNode;
        var canidates = [];
        if (cn.nextSprite) canidates.push(cn.nextSprite);
        if (cn.north.nextSprite) canidates.push(cn.north.nextSprite);
        if (cn.south.nextSprite) canidates.push(cn.south.nextSprite);
        if (cn.east.nextSprite) canidates.push(cn.east.nextSprite);
        if (cn.west.nextSprite) canidates.push(cn.west.nextSprite);
        if (cn.north.east.nextSprite) canidates.push(cn.north.east.nextSprite);
        if (cn.north.west.nextSprite) canidates.push(cn.north.west.nextSprite);
        if (cn.south.east.nextSprite) canidates.push(cn.south.east.nextSprite);
        if (cn.south.west.nextSprite) canidates.push(cn.south.west.nextSprite);
        return canidates
    };
    this.checkCollisionsAgainst = function (canidates) {
        for (var i = 0; i < canidates.length; i++) {
            var ref = canidates[i];
            do {
                this.checkCollision(ref);
                ref = ref.nextSprite;
            } while (ref)
        }
    };
    this.checkCollision = function (other) {
        if (!other.visible ||
            this == other ||
            this.collidesWith.indexOf(other.name) == -1) return;
        var trans = other.transformedPoints();
        var px, py;
        var count = trans.length / 2;
        for (var i = 0; i < count; i++) {
            px = trans[i * 2];
            py = trans[i * 2 + 1];
            if (this.context.isPointInPath(px, py)) {
                other.collision(this);
                this.collision(other);
                return;
            }
        }
    };
    this.collision = function () {
    };
    this.die = function () {
        this.visible = false;
        this.reap = true;
        if (this.currentNode) {
            this.currentNode.leave(this);
            this.currentNode = null;
        }
    };
    this.transformedPoints = function () {
        if (this.transPoints) return this.transPoints;
        var trans = new Array(this.points.length);
        this.matrix.configure(this.rot, this.scale, this.x, this.y);
        for (var i = 0; i < this.points.length / 2; i++) {
            var xi = i * 2;
            var yi = xi + 1;
            var pts = this.matrix.multiply(this.points[xi], this.points[yi], 1);
            trans[xi] = pts[0];
            trans[yi] = pts[1];
        }
        this.transPoints = trans; // cache translated points
        return trans;
    };
    this.isClear = function () {
        if (this.collidesWith.length == 0) return true;
        var cn = this.currentNode;
        if (cn == null) {
            var gridx = Math.floor(this.x / GRID_SIZE);
            var gridy = Math.floor(this.y / GRID_SIZE);
            gridx = (gridx >= this.grid.length) ? 0 : gridx;
            gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
            cn = this.grid[gridx][gridy];
        }
        return (cn.isEmpty(this.collidesWith) &&
        cn.north.isEmpty(this.collidesWith) &&
        cn.south.isEmpty(this.collidesWith) &&
        cn.east.isEmpty(this.collidesWith) &&
        cn.west.isEmpty(this.collidesWith) &&
        cn.north.east.isEmpty(this.collidesWith) &&
        cn.north.west.isEmpty(this.collidesWith) &&
        cn.south.east.isEmpty(this.collidesWith) &&
        cn.south.west.isEmpty(this.collidesWith));
    };
    this.wrapPostMove = function () {
        if (this.x > Game.canvasWidth) {
            this.x = 0;
        } else if (this.x < 0) {
            this.x = Game.canvasWidth;
        }
        if (this.y > Game.canvasHeight) {
            this.y = 0;
        } else if (this.y < 0) {
            this.y = Game.canvasHeight;
        }
    };

};

const Ship = function (color) {
    this.init("ship",
        [-15, 4,
            0, -32,
            15, 4],
        color);

    this.playerId = '';

    this.children.exhaust = new Sprite();
    this.children.exhaust.init("exhaust",
        [-4, 6,
            0, 16,
            4, 6],
        '#ff9900');

    this.bulletCounter = 0;

    this.didShot = false;

    this.postMove = this.wrapPostMove;

    this.collidesWith = ["asteroid", "bigalien", "alienbullet"];

    this.preMove = function (delta) {

    };

    this.collision = function (other) {
        SFX['explosion'].play();
        Game.explosionAt(other.x, other.y);
        Game.FSM.state = 'player_died';
        // this.visible = false;
        // this.currentNode.leave(this);
        // this.currentNode = null;
        // Game.lives--;
        // do vibration?
    };

};
Ship.prototype = new Sprite();

const BigAlien = function () {
    this.init("bigalien",
        [-20, 0,
            -12, -4,
            12, -4,
            20, 0,
            12, 4,
            -12, 4,
            -20, 0,
            20, 0],
    '#0abbcb');

    this.scale = 3;

    this.children.top = new Sprite();
    this.children.top.init("bigalien_top",
        [-8, -4,
            -6, -6,
            6, -6,
            8, -4]);
    this.children.top.visible = true;

    this.children.bottom = new Sprite();
    this.children.bottom.init("bigalien_top",
        [8, 4,
            6, 6,
            -6, 6,
            -8, 4]);
    this.children.bottom.visible = true;

    this.collidesWith = ["asteroid", "ship", "bullet"];

    this.bridgesH = false;

    this.bullets = [];
    this.bulletCounter = 0;

    this.newPosition = function () {
        if (Math.random() < 0.5) {
            this.x = -20;
            this.vel.x = 1.5;
        } else {
            this.x = Game.canvasWidth + 20;
            this.vel.x = -1.5;
        }
        this.y = Math.random() * Game.canvasHeight;
    };

    this.setup = function () {
        this.newPosition();

        for (var i = 0; i < 6; i++) {
            var bull = new AlienBullet();
            this.bullets.push(bull);
            Game.sprites.push(bull);
        }
    };

    this.preMove = function (delta) {
        var cn = this.currentNode;
        if (cn == null) return;

        var topCount = 0;
        if (cn.north.nextSprite) topCount++;
        if (cn.north.east.nextSprite) topCount++;
        if (cn.north.west.nextSprite) topCount++;

        var bottomCount = 0;
        if (cn.south.nextSprite) bottomCount++;
        if (cn.south.east.nextSprite) bottomCount++;
        if (cn.south.west.nextSprite) bottomCount++;

        if (topCount > bottomCount) {
            this.vel.y = 1;
        } else if (topCount < bottomCount) {
            this.vel.y = -1;
        } else if (Math.random() < 0.01) {
            this.vel.y = -this.vel.y;
        }

        this.bulletCounter -= delta;
        if (this.bulletCounter <= 0) {
            this.bulletCounter = 22;
            for (var i = 0; i < this.bullets.length; i++) {
                if (!this.bullets[i].visible) {
                    const bullet = this.bullets[i];
                    var rad = 2 * Math.PI * Math.random();
                    var vectorx = Math.cos(rad);
                    var vectory = Math.sin(rad);
                    bullet.x = this.x;
                    bullet.y = this.y;
                    bullet.vel.x = 6 * vectorx;
                    bullet.vel.y = 6 * vectory;
                    bullet.visible = true;
                    SFX['laser'].play();
                    break;
                }
            }
        }

    };

    BigAlien.prototype.collision = function (other) {
        if (other.name == "bullet") Game.score += 200;
        SFX['explosion'].play();
        Game.explosionAt(other.x, other.y);
        this.visible = false;
        this.newPosition();
    };

    this.postMove = function () {
        if (this.y > Game.canvasHeight) {
            this.y = 0;
        } else if (this.y < 0) {
            this.y = Game.canvasHeight;
        }

        if ((this.vel.x > 0 && this.x > Game.canvasWidth + 20) ||
            (this.vel.x < 0 && this.x < -20)) {
            // why did the alien cross the road?
            this.visible = false;
            this.newPosition();
        }
    }
};
BigAlien.prototype = new Sprite();

const Bullet = function () {

    this.init("bullet",
        [0, 0],
        '#ff0000');
    this.time = 0;
    this.bridgesH = false;
    this.bridgesV = false;
    this.postMove = this.wrapPostMove;
    // asteroid can look for bullets so doesn't have
    // to be other way around
    //this.collidesWith = ["asteroid"];

    this.configureTransform = function () {
    };
    this.draw = function () {
        if (this.visible) {
            this.context.save();
            this.context.lineWidth = 8;
            this.context.strokeStyle = this.color;
            this.context.beginPath();
            this.context.moveTo(this.x - 1, this.y - 1);
            this.context.lineTo(this.x + 1, this.y + 1);
            this.context.moveTo(this.x + 1, this.y - 1);
            this.context.lineTo(this.x - 1, this.y + 1);
            this.context.stroke();
            this.context.restore();
        }
    };
    this.preMove = function (delta) {
        if (this.visible) {
            this.time += delta;
        }
        if (this.time > 75) {
            this.visible = false;
            this.time = 0;
        }
    };
    this.collision = function (other) {
        this.time = 0;
        this.visible = false;
        this.currentNode.leave(this);
        this.currentNode = null;
    };
    this.transformedPoints = function (other) {
        return [this.x, this.y];
    };

};
Bullet.prototype = new Sprite();

const AlienBullet = function () {
    this.init("alienbullet");
    this.color = '#ff0000';

    this.draw = function () {
        if (this.visible) {
            this.context.save();
            this.context.lineWidth = 8;
            this.context.strokeStyle = this.color;
            this.context.beginPath();
            this.context.moveTo(this.x, this.y);
            this.context.lineTo(this.x - this.vel.x, this.y - this.vel.y);
            this.context.stroke();
            this.context.restore();
        }
    };
};
AlienBullet.prototype = new Bullet();

const Asteroid = function () {
    this.init("asteroid",
        [-10, 0,
            -5, 7,
            -3, 4,
            1, 10,
            5, 4,
            10, 0,
            5, -6,
            2, -10,
            -4, -10,
            -4, -5],
        '#cf8125');

    this.visible = true;
    this.scale = 12;
    this.postMove = this.wrapPostMove;

    this.collidesWith = ["ship", "bullet", "bigalien", "alienbullet"];

    this.collision = function (other) {
        SFX['explosion'].play();
        if (other.name == "bullet") Game.score += 120 / this.scale;
        var breakDown = Math.floor(Game.score / 1500);
        breakDown += 3;
        this.scale = this.scale / 2;
        if (this.scale > 1.5) {
            // break into fragments
            for (var i = 0; i < breakDown; i++) {
                var roid = this.clone();
                roid.vel.x = Math.random() * 6 - 3;
                roid.vel.y = Math.random() * 6 - 3;
                if (Math.random() > 0.5) {
                    roid.points.reverse();
                }
                roid.vel.rot = Math.random() * 2 - 1;
                roid.move(roid.scale * 6); // give them a little push
                Game.sprites.push(roid);
            }
        }
        Game.explosionAt(other.x, other.y);
        this.die();
    };
    this.clone = function() {
        var roid = new Asteroid();
        roid.scale = this.scale;
        roid.x = this.x
        roid.y = this.y
        roid.vel.x = this.vel.x;
        roid.vel.y = this.vel.y;
        roid.vel.rot = this.vel.rot;
        return roid;
    };
};
Asteroid.prototype = new Sprite();

const Explosion = function () {
    this.init("explosion");

    this.bridgesH = false;
    this.bridgesV = false;

    this.lines = [];
    for (var i = 0; i < 5; i++) {
        var rad = 2 * Math.PI * Math.random();
        var x = Math.cos(rad);
        var y = Math.sin(rad);
        this.lines.push([x, y, x * 2, y * 2]);
    }

    this.draw = function () {
        if (this.visible) {
            this.context.save();
            this.context.lineWidth = 1.0 / this.scale;
            this.context.strokeStyle = '#ff0000';
            this.context.beginPath();
            for (var i = 0; i < 5; i++) {
                var line = this.lines[i];
                this.context.moveTo(line[0], line[1]);
                this.context.lineTo(line[2], line[3]);
            }
            this.context.stroke();
            this.context.restore();
        }
    };

    this.preMove = function (delta) {
        if (this.visible) {
            this.scale += delta;
        }
        if (this.scale > 8) {
            this.die();
        }
    };
};
Explosion.prototype = new Sprite();

const GridNode = function () {
    this.north = null;
    this.south = null;
    this.east = null;
    this.west = null;

    this.nextSprite = null;

    this.dupe = {
        horizontal: null,
        vertical: null
    };

    this.enter = function (sprite) {
        sprite.nextSprite = this.nextSprite;
        this.nextSprite = sprite;
    };

    this.leave = function (sprite) {
        var ref = this;
        while (ref && (ref.nextSprite != sprite)) {
            ref = ref.nextSprite;
        }
        if (ref) {
            ref.nextSprite = sprite.nextSprite;
            sprite.nextSprite = null;
        }
    };

    this.eachSprite = function (sprite, callback) {
        var ref = this;
        while (ref.nextSprite) {
            ref = ref.nextSprite;
            callback.call(sprite, ref);
        }
    };

    this.isEmpty = function (collidables) {
        var empty = true;
        var ref = this;
        while (ref.nextSprite) {
            ref = ref.nextSprite;
            empty = !ref.visible || collidables.indexOf(ref.name) == -1
            if (!empty) break;
        }
        return empty;
    };
};

// borrowed from typeface-0.14.js
// http://typeface.neocracy.org
const Text = {
    renderGlyph: function (ctx, face, char) {

        var glyph = face.glyphs[char];

        if (glyph.o) {

            var outline;
            if (glyph.cached_outline) {
                outline = glyph.cached_outline;
            } else {
                outline = glyph.o.split(' ');
                glyph.cached_outline = outline;
            }

            var outlineLength = outline.length;
            for (var i = 0; i < outlineLength;) {

                var action = outline[i++];

                switch (action) {
                    case 'm':
                        ctx.moveTo(outline[i++], outline[i++]);
                        break;
                    case 'l':
                        ctx.lineTo(outline[i++], outline[i++]);
                        break;

                    case 'q':
                        var cpx = outline[i++];
                        var cpy = outline[i++];
                        ctx.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
                        break;

                    case 'b':
                        var x = outline[i++];
                        var y = outline[i++];
                        ctx.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
                        break;
                }
            }
        }
        if (glyph.ha) {
            ctx.translate(glyph.ha, 0);
        }
    },

    renderText: function (text, size, x, y) {
        this.context.save();

        this.context.translate(x, y);

        var pixels = size * 72 / (this.face.resolution * 100);
        this.context.scale(pixels, -1 * pixels);
        this.context.beginPath();
        this.context.fillStyle = '#ffffff';
        var chars = text.split('');
        var charsLength = chars.length;
        for (var i = 0; i < charsLength; i++) {
            this.renderGlyph(this.context, this.face, chars[i]);
        }
        this.context.fill();

        this.context.restore();
    },

    context: null,
    face: null
};

window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

var SFXObjects = [
    {
        name: 'laser',
        file: '39459__THE_bizniss__laser.wav',
        play: function () {
        }
    },
    {
        name: 'explosion',
        file: '51467__smcameron__missile_explosion.wav',
        play: function () {
        }
    }
];

var SFX = { muted: true };

function ajax(url, callback, data, responseType) {
    var x;
    if (responseType == null) {
        responseType = 'text';
    }
    try {
        x = new XMLHttpRequest('MSXML2.XMLHTTP.3.0');
        x.open(data ? 'POST' : 'GET', url, 1);
        x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        x.responseType = responseType;
        x.onreadystatechange = function () {
            if (x.readyState == 4 && (x.status == 200 || x.status == 0)) {
                callback(x.response, x);
            }
        };
        x.send(data)
    } catch (e) {
        window.console && console.log(e);
    }
};
// http://www.html5rocks.com/en/tutorials/webaudio/intro/js/rhythm-sample.js
var context = false;
if (typeof AudioContext == 'function') {
    context = new AudioContext();
}
SFXObjects.forEach(function (SFXObject, sound) {
    if (SFXObject.file == null) return;
    // load file
    SFX[SFXObject.name] = SFXObject;
    if (context) {
        ajax(SFXObject.file, function (data) {
            context.decodeAudioData(data, function (buffer) {
                if (SFXObject.name == 'laser') {
                  SFX[SFXObject.name].play = () => {};
                  return;
                }
                SFX[SFXObject.name].play = function () {
                    if (SFX.muted) return;
                    var source = context.createBufferSource();
                    source.buffer = buffer;
                    source.connect(context.destination);
                    if (!source.start)
                        source.start = source.noteOn;
                    source.start(0);
                };
            });
        }, '', 'arraybuffer');
    }
});

var Game = {
    score: 0,
    totalAsteroids: 5,
    lives: 0,

    canvasWidth: 800,
    canvasHeight: 600,

    sprites: [],
    ship: null,
    ships: [],
    bigAlien: null,

    nextBigAlienTime: null,


    spawnAsteroids: function (count) {
        if (!count) count = this.totalAsteroids;
        for (var i = 0; i < count; i++) {
            var roid = new Asteroid();
            roid.x = Math.random() * this.canvasWidth;
            roid.y = Math.random() * this.canvasHeight;
            while (!roid.isClear()) {
                roid.x = Math.random() * this.canvasWidth;
                roid.y = Math.random() * this.canvasHeight;
            }
            roid.vel.x = Math.random() * 4 - 2;
            roid.vel.y = Math.random() * 4 - 2;
            if (Math.random() > 0.5) {
                roid.points.reverse();
            }
            roid.vel.rot = Math.random() * 2 - 1;
            Game.sprites.push(roid);
        }
    },

    explosionAt: function (x, y) {
        var splosion = new Explosion();
        splosion.x = x;
        splosion.y = y;
        splosion.visible = true;
        Game.sprites.push(splosion);
    },

    FSM: {
        boot: function () {
            Game.spawnAsteroids(Math.round(Game.canvasWidth / 250));
            this.state = 'start';
        },
        waiting: function () {
            return;
            Text.renderText('Join the game to start.', 36, Game.canvasWidth / 2 - 270, Game.canvasHeight / 2);
            if (KEY_STATUS.space || window.gameStart) {
                KEY_STATUS.space = false; // hack so we don't shoot right away
                window.gameStart = false;
                this.state = 'start';
            }
        },
        start: function () {
            for (var i = 0; i < Game.sprites.length; i++) {
                if (Game.sprites[i].name == 'asteroid') {
                    Game.sprites[i].die();
                } else if (Game.sprites[i].name == 'bullet' ||
                    Game.sprites[i].name == 'bigalien') {
                    Game.sprites[i].visible = false;
                }
            }

            Game.score = 0;
            Game.lives = 5;
            Game.totalAsteroids = 2;
            Game.spawnAsteroids();

            Game.nextBigAlienTime = Date.now() + 30000 + (30000 * Math.random());

            //this.state = 'spawn_ship';
            this.state = 'run';
        },
        spawn_ship: function () {
            var ship = {};
            ship.x = Game.canvasWidth / 2;
            ship.y = Game.canvasHeight / 2;
            if (ship.isClear()) {
                ship.rot = 0;
                ship.vel.x = 0;
                ship.vel.y = 0;
                ship.visible = true;
                Game.ships.push(ship);
                this.state = 'run';
            }
        },
        run: function () {
            for (var i = 0; i < Game.sprites.length; i++) {
                if (Game.sprites[i].name == 'asteroid') {
                    break;
                }
            }
            if (i == Game.sprites.length) {
                this.state = 'new_level';
            }
            if (!Game.bigAlien.visible &&
                Date.now() > Game.nextBigAlienTime) {
                Game.bigAlien.visible = true;
                Game.nextBigAlienTime = Date.now() + (30000 * Math.random());
            }
        },
        new_level: function () {
            if (this.timer == null) {
                this.timer = Date.now();
            }
            // wait a second before spawning more asteroids
            if (Date.now() - this.timer > 1000) {
                this.timer = null;
                Game.totalAsteroids++;
                if (Game.totalAsteroids > 12) Game.totalAsteroids = 12;
                Game.spawnAsteroids();
                this.state = 'run';
            }
        },
        player_died: function () {
            Game.score -= 100;
            if (Game.score < 0) Game.score = 0;
            this.state = 'run';
        },
        end_game: function () {
            Text.renderText('GAME OVER', 50, Game.canvasWidth / 2 - 160, Game.canvasHeight / 2 + 10);
            if (this.timer == null) {
                this.timer = Date.now();
            }
            // wait 5 seconds then go back to waiting state
            if (Date.now() - this.timer > 5000) {
                this.timer = null;
                this.state = 'waiting';
            }

            window.gameStart = false;
        },

        execute: function () {
            this[this.state]();
        },
        state: 'boot'
    }

};

var sprites = [];

async function init() {
    var canvas = document.querySelector("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    Game.canvasWidth = canvas.width;
    Game.canvasHeight = canvas.height;
    const host = await startHost()
    document.body.insertBefore(host.getQrCode(), canvas);

    var context = canvas.getContext("2d");

    Text.context = context;
    Text.face = vector_battle;

    var gridWidth = Math.ceil(Game.canvasWidth / GRID_SIZE);
    var gridHeight = Math.ceil(Game.canvasHeight / GRID_SIZE);
    var grid = new Array(gridWidth);
    for (var i = 0; i < gridWidth; i++) {
        grid[i] = new Array(gridHeight);
        for (var j = 0; j < gridHeight; j++) {
            grid[i][j] = new GridNode();
        }
    }

    // set up the positional references
    for (var i = 0; i < gridWidth; i++) {
        for (var j = 0; j < gridHeight; j++) {
            var node = grid[i][j];
            node.north = grid[i][(j == 0) ? gridHeight - 1 : j - 1];
            node.south = grid[i][(j == gridHeight - 1) ? 0 : j + 1];
            node.west = grid[(i == 0) ? gridWidth - 1 : i - 1][j];
            node.east = grid[(i == gridWidth - 1) ? 0 : i + 1][j];
        }
    }

    // set up borders
    for (var i = 0; i < gridWidth; i++) {
        grid[i][0].dupe.vertical = Game.canvasHeight;
        grid[i][1].dupe.vertical = Game.canvasHeight;
        grid[i][2].dupe.vertical = Game.canvasHeight;
        grid[i][gridHeight - 3].dupe.vertical = -Game.canvasHeight;
        grid[i][gridHeight - 2].dupe.vertical = -Game.canvasHeight;
        grid[i][gridHeight - 1].dupe.vertical = -Game.canvasHeight;
    }

    for (var j = 0; j < gridHeight; j++) {
        grid[0][j].dupe.horizontal = Game.canvasWidth;
        grid[1][j].dupe.horizontal = Game.canvasWidth;
        grid[2][j].dupe.horizontal = Game.canvasWidth;
        grid[gridWidth - 3][j].dupe.horizontal = -Game.canvasWidth;
        grid[gridWidth - 2][j].dupe.horizontal = -Game.canvasWidth;
        grid[gridWidth - 1][j].dupe.horizontal = -Game.canvasWidth;
    }

    //Game.sprites = sprites;

    // so all the sprites can use it
    Sprite.prototype.context = context;
    Sprite.prototype.grid = grid;
    Sprite.prototype.matrix = new Matrix(2, 3);

    var bigAlien = new BigAlien();
    bigAlien.setup();
    Game.sprites.push(bigAlien);
    Game.bigAlien = bigAlien;

    var extraDude = new Ship();
    extraDude.scale = 0.4;
    extraDude.visible = true;
    extraDude.preMove = null;
    extraDude.children = [];

    var i, j = 0;

    var paused = false;
    var showFramerate = false;
    var avgFramerate = 0;
    var frameCount = 0;
    var elapsedCounter = 0;

    var lastFrame = Date.now();
    var thisFrame;
    var elapsed;
    var delta;

    // shim layer with setTimeout fallback
    // from here:
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    var mainLoop = function () {
        context.clearRect(0, 0, Game.canvasWidth, Game.canvasHeight);

        const deadZone = (axis) =>
            Math.sign(axis) * Math.max(Math.abs(axis) - .1, 0) / .9;
        for (const con of navigator.getGamepads()) {
            if (!con?.connected) continue;
            const playerId = con.index;
            const ship = Game.ships['player_' + playerId];
            if (!ship || ship.name === 'ship-dead') continue;
            if (!ship.didShot && con.buttons[0].pressed) shoot(playerId);
            ship.didShot = con.buttons[0].pressed;
            const accel = -deadZone(con.axes[1]);
            const rot = deadZone(con.axes[0]) / 5;
            updateMotion(playerId, rot, accel);
        }

        // Make sure the image is loaded first otherwise nothing will draw.
        Game.FSM.execute();

        if (KEY_STATUS.g) {
            context.beginPath();
            context.strokeStyle = 'white';
            for (var i = 0; i < gridWidth; i++) {
                context.moveTo(i * GRID_SIZE, 0);
                context.lineTo(i * GRID_SIZE, Game.canvasHeight);
            }
            for (var j = 0; j < gridHeight; j++) {
                context.moveTo(0, j * GRID_SIZE);
                context.lineTo(Game.canvasWidth, j * GRID_SIZE);
            }
            context.closePath();
            context.stroke();
        }

        thisFrame = Date.now();
        elapsed = thisFrame - lastFrame;
        lastFrame = thisFrame;
        delta = elapsed / 30;

        for (i = 0; i < Game.sprites.length; i++) {

            Game.sprites[i].run(delta);

            if (Game.sprites[i].reap) {
                Game.sprites[i].reap = false;
                Game.sprites.splice(i, 1);
                i--;
            }
        }

        // score
        var score_text = '' + Math.round(Game.score);
        Text.renderText(score_text, 28, Game.canvasWidth - 26 * score_text.length, 30);

        // extra dudes
        // for (i = 0; i < Game.lives; i++) {
        //     context.save();
        //     extraDude.x = Game.canvasWidth - (16 * (i + 1));
        //     extraDude.y = 50;
        //     extraDude.configureTransform();
        //     extraDude.draw();
        //     context.restore();
        // }

        if (showFramerate) {
            Text.renderText('' + avgFramerate, 24, Game.canvasWidth - 38, Game.canvasHeight - 2);
        }

        frameCount++;
        elapsedCounter += elapsed;
        if (elapsedCounter > 1000) {
            elapsedCounter -= 1000;
            avgFramerate = frameCount;
            frameCount = 0;
        }

        if (paused) {
            Text.renderText('PAUSED', 72, Game.canvasWidth / 2 - 160, 120);
        } else {
            requestAnimationFrame(mainLoop);
        }
    };

    mainLoop();

    window.addEventListener('keydown', (e) => {
        switch (KEY_CODES[e.keyCode]) {
            case 'f': // show framerate
                showFramerate = !showFramerate;
                break;
            case 'p': // pause
                paused = !paused;
                if (!paused) {
                    // start up again
                    lastFrame = Date.now();
                    mainLoop();
                }
                break;
            case 'm': // mute
                SFX.muted = !SFX.muted;
                break;
        }
    });

    window.addEventListener('gamepadconnected', ({ gamepad }) => {
      var color = randomColor();
      addPlayer(gamepad.index, color);
    });

    window.addEventListener('gamepaddisconnected', ({ gamepad }) => {
      removePlayer(gamepad.index);
    });
}

await init();

function addPlayer(playerId, color) {

    var ship = new Ship(color);

    ship.name = 'ship';
    ship.playerId = playerId;
    ship.x = Game.canvasWidth / 2;
    ship.y = Game.canvasHeight / 2;

    ship.bullets = [];
    for (var i = 0; i < 15; i++) {
        var bull = new Bullet();
        ship.bullets.push(bull);
        Game.sprites.push(bull);
    }

    ship.rot = 0;
    ship.vel.x = 0;
    ship.vel.y = 0;
    ship.visible = true;
    Game.sprites.push(ship);
    Game.ships['player_' + playerId] = ship;

}

function removePlayer(playerId) {
    var playerShip = Game.ships['player_' + playerId];

    playerShip.name = 'ship-dead';
    Game.sprites.splice(Game.sprites.indexOf(playerShip), 1);
    Game.ships.splice(Game.ships.indexOf(playerShip), 1);
}

function randomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function shoot(playerId) {
    const ship = Game.ships['player_' + playerId];
    for (const bullet of ship.bullets) {
        if (bullet.visible) continue;
        SFX['laser'].play();
        var rad = ((ship.rot - 90) * Math.PI) / 180;
        var vectorx = Math.cos(rad);
        var vectory = Math.sin(rad);
        // move to the nose of the ship
        bullet.x = ship.x + vectorx * 4;
        bullet.y = ship.y + vectory * 4;
        bullet.vel.x = 12 * vectorx + ship.vel.x;
        bullet.vel.y = 12 * vectory + ship.vel.y;
        bullet.visible = true;
        break;
    }
}

function updateMotion(playerId, rotation, accel) {
    const ship = Game.ships['player_' + playerId];
    ship.vel.rot = rotation * 22;
    var rad = ((ship.rot - 90) * Math.PI) / 180;
    if (accel < 0) {
        ship.acc.x = 0;
        ship.acc.y = 0;
    //     // slow down.
    //     ship.acc.x = -.1 * Math.cos(rad);
    //     ship.acc.y = -.1 * Math.sin(rad);
        ship.children.exhaust.visible = false;
        return;
    }

    ship.children.exhaust.visible = Math.random() > 0.1;

    let accelX = accel * Math.cos(rad);
    let accelY = accel * Math.sin(rad);

    if (ship.vel.x ** 2 + ship.vel.y ** 2 > 32 ** 2) {
        if (Math.sign(accelX) === Math.sign(ship.vel.x)) accelX = 0;
        if (Math.sign(accelY) === Math.sign(ship.vel.y)) accelY = 0;
    }

    ship.acc.x = accelX;
    ship.acc.y = accelY;
}
