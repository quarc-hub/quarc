import { Component, signal, OnInit } from "../../core/index";
import { bootstrapApplication } from "../../platform-browser/browser";

// Symulacja IconComponent
@Component({
    selector: 'test-icon',
    template: '<span>Icon</span>',
})
class TestIconComponent {}

// Symulacja Device interface
interface Device {
    address: string;
    name: string;
    offline: boolean;
}

// Reprodukcja komponentu DevicesComponent z /web/IoT/Ant
@Component({
    selector: 'test-devices',
    template: `
        <div class="content">
            @for (device of devices(); track device.address) {
                <div class="device card" (click)="openDevice(device.address)">
                    <div class="icon">
                        <test-icon></test-icon>
                    </div>
                    <div class="content">
                        <div class="name">{{ device.name || 'Unnamed' }}</div>
                        <div class="address">{{ device.address }}</div>
                    </div>
                </div>
            }
        </div>
        <div class="footer">
            Devices: <span>{{ deviceCount() }}</span>
        </div>
    `,
    imports: [TestIconComponent],
})
class TestDevicesComponent implements OnInit {
    public devices = signal<Device[]>([]);
    public deviceCount = signal(0);

    ngOnInit(): void {
        this.loadDevices();
    }

    private loadDevices(): void {
        const mockDevices: Device[] = [
            { address: '192.168.1.1', name: 'Device 1', offline: false },
            { address: '192.168.1.2', name: 'Device 2', offline: false },
            { address: '192.168.1.3', name: 'Device 3', offline: true },
        ];

        this.devices.set(mockDevices);
        this.deviceCount.set(mockDevices.length);
    }

    public openDevice(address: string): void {
        console.log('Opening device:', address);
    }
}

// Root component
@Component({
    selector: 'test-app',
    template: '<test-devices></test-devices>',
    imports: [TestDevicesComponent],
})
class TestAppComponent {}

// Test suite
export function runDevicesComponentTests() {
    console.log('\n=== Test: Devices Component Rendering ===\n');

    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    bootstrapApplication(TestAppComponent, {
        providers: [],
    });

    setTimeout(() => {
        const appElement = document.querySelector('test-app');
        console.log('App element:', appElement);
        console.log('App element HTML:', appElement?.innerHTML);

        const devicesElement = document.querySelector('test-devices');
        console.log('\nDevices element:', devicesElement);
        console.log('Devices element HTML:', devicesElement?.innerHTML);

        const contentDiv = document.querySelector('.content');
        console.log('\nContent div:', contentDiv);
        console.log('Content div HTML:', contentDiv?.innerHTML);

        const deviceCards = document.querySelectorAll('.device.card');
        console.log('\nDevice cards found:', deviceCards.length);

        const footerDiv = document.querySelector('.footer');
        console.log('Footer div:', footerDiv);
        console.log('Footer text:', footerDiv?.textContent);

        // Testy
        const tests = {
            'App element exists': !!appElement,
            'Devices element exists': !!devicesElement,
            'Content div exists': !!contentDiv,
            'Device cards rendered': deviceCards.length === 3,
            'Footer exists': !!footerDiv,
            'Footer shows count': footerDiv?.textContent?.includes('3'),
        };

        console.log('\n=== Test Results ===');
        let passed = 0;
        let failed = 0;

        Object.entries(tests).forEach(([name, result]) => {
            const status = result ? '✓ PASS' : '✗ FAIL';
            console.log(`${status}: ${name}`);
            if (result) passed++;
            else failed++;
        });

        console.log(`\nTotal: ${passed} passed, ${failed} failed`);

        // Sprawdzenie czy template został przetworzony
        const componentInstance = (devicesElement as any)?.componentInstance;
        if (componentInstance) {
            console.log('\n=== Component State ===');
            console.log('devices():', componentInstance.devices());
            console.log('deviceCount():', componentInstance.deviceCount());
        }

        // Sprawdzenie czy @for został przekształcony
        const componentType = (devicesElement as any)?.componentType;
        if (componentType) {
            const template = componentType._quarcComponent?.[0]?.template;
            console.log('\n=== Transformed Template ===');
            console.log(template);

            if (template) {
                const hasNgFor = template.includes('*ngFor');
                const hasNgContainer = template.includes('ng-container');
                console.log('\nTemplate transformation check:');
                console.log('  Contains *ngFor:', hasNgFor);
                console.log('  Contains ng-container:', hasNgContainer);
                console.log('  @for was transformed:', hasNgFor && hasNgContainer);
            }
        }

        if (failed > 0) {
            console.error('\n❌ DEVICES COMPONENT TEST FAILED - Component nie renderuje contentu');
        } else {
            console.log('\n✅ DEVICES COMPONENT TEST PASSED');
        }

        document.body.removeChild(container);
    }, 500);
}
