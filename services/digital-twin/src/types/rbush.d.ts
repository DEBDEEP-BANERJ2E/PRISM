declare module 'rbush' {
  interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  interface RBushItem extends BBox {
    [key: string]: any;
  }

  class RBush<T extends RBushItem = RBushItem> {
    constructor(maxEntries?: number);
    insert(item: T): this;
    remove(item: T): this;
    search(bbox: BBox): T[];
    clear(): this;
    toJSON(): any;
  }

  export = RBush;
}