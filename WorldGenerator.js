class WorldGenerator {
    constructor(w) {
        this.cols = Math.floor(w/2)*2;
        this.rows = this.cols/2;

        this.cells = [];
        for(let i = 0; i < this.cols; i++) {
            this.cells[i] = [];
            for (let j = 0; j < this.rows; j++) {
                this.cells[i][j] = {
                    x: i,
                    y: j
                };
            }
        }
    }

    getCell(x, y) {
        //handle spherical shaped world
        while(x < 0) x += this.cols;
        while(x > this.cols) x -= this.cols;
        while(y < 0) y += this.rows;
        while(y > this.rows) y -= this.rows;

        return this.cells[x][y];
    }

    *actOnCell(func, drawFunc) {
        for(let i in this.cells) {
            for(let j in this.cells[i]) {
                func(this, this.cells[i][j]);
                if(drawFunc) drawFunc(this, this.cells[i][j]);
                yield;
            }
        }
    }

    testNoise(world, cell) {
        cell.noise = noise(cell.x/100, cell.y/100)*255;
    }

    testDrawCell(world, cell) {
        if(!cell.noise) return;

        fill(cell.noise);
        noStroke();
        rect(
            map(cell.x, 0, world.cols, 0, width),
            map(cell.y, 0, world.rows, 0, height),
            width/world.cols,
            height/world.rows
        )
    }
}