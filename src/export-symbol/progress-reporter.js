import EventEmitter from "@skpm/events";

export class ProgressReporter extends EventEmitter {
  constructor(total = 0) {
    super();
    this.total_ = total;
    this.counter = 0;
    this.childReporters = [];
  }

  get total() {
    return this.total_;
  }

  set total(total) {
    this.total_ = total;
    this.emitProgress();
  }

  get progress() {
    if (!this.total && !this.childReporters.length) {
      return 0;
    }

    return (
      (this.childReporters.reduce((acc, child) => acc + child.progress, 0) + this.counter) / (this.total + this.childReporters.length)
    );
  }

  increment() {
    ++this.counter;
    this.emitProgress();
  }

  forceProgress(progress) {
    if (this.childReporters.length) {
      throw new Error("Cannot force progress when there are child reporters");
    }

    if (!this.total) {
      this.total = 1;
    }

    this.counter = progress * this.total;
    this.emitProgress();
  }

  makeChildren(numChildren) {
    let newChildren = Array(numChildren)
      .fill(0)
      .map(a => {
        let childReporter = new ProgressReporter();
        childReporter.on("progress", () => this.emitProgress());
        return childReporter;
      });
    this.childReporters = this.childReporters.concat(newChildren);
    this.emitProgress();
    return newChildren;
  }

  emitProgress() {
    this.emit("progress", this.progress);
  }
}
