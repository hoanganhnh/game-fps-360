import Component from '../Component';

export default class PlayerHealth extends Component {
    constructor() {
        super();
        this.health = 100;
    }

    TakeHit = (e) => {
        this.health = Math.max(0, this.health - 10);
        this.uiManager.SetHealth(this.health);
    };

    Initialize() {
        this.uiManager = this.FindEntity('UIManager').GetComponent('UIManager');
        this.parent.RegisterEventHandler(this.TakeHit, 'hit');
        this.uiManager.SetHealth(this.health);
    }
}
