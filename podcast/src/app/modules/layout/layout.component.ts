import { Component, Injector, NgZone, OnInit } from '@angular/core';
import { FooterComponent } from './components/footer/footer.component';
import { NavigationEnd, Router, RouterOutlet, Event } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { BottomNavbarComponent } from './components/bottom-navbar/bottom-navbar.component';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { CommonModule } from '@angular/common';
import { AlertModalComponent } from 'src/app/shared/components/alert/alert.component';
import { GetInTouchModalComponent } from 'src/app/shared/components/getInTouch/get-in-touch.component';
import { IFormattedUserNotification, UserNotificationHelper } from 'src/shared/helpers/UserNotificationHelper';
import {
  DeviceDto,
  NotificationServiceProxy,
  PushNotificationServiceProxy,
  UserNotification,
} from 'src/shared/service-proxies/service-proxies';
import { UrlHelper } from 'src/app/shared/helpers/UrlHelper';
import { Capacitor } from '@capacitor/core';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    NavbarComponent,
    RouterOutlet,
    FooterComponent,
    BottomNavbarComponent,
    CommonModule,
    AlertModalComponent,
    GetInTouchModalComponent,
  ],
})
export class LayoutComponent extends AppComponentBase implements OnInit {
  private static readonly BOTTOM_NAV_ROUTES = ['/home', '/categories', '/playlists', '/profile'];

  private mainContent: HTMLElement | null = null;
  hideBottomNavbar = false;

  constructor(
    injector: Injector,
    public _zone: NgZone,
    private _notificationService: NotificationServiceProxy,
    private _userNotificationHelper: UserNotificationHelper,
    private _pushNotificationService: PushNotificationServiceProxy,
  ) {
    super(injector);
    document.body.classList.add('overflow-y-clip');
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        if (this.mainContent) {
          this.mainContent!.scrollTop = 0;
        }
        this.syncBottomNavbarVisibility();
      }
    });
  }

  ngOnInit(): void {
    this.registerToEvents();
    this.pushNotifications();
    this.syncBottomNavbarVisibility();
    this.subscribeToEvent('app.show.nav', () => this.syncBottomNavbarVisibility());
  }

  private shouldShowBottomNavbar(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    return LayoutComponent.BOTTOM_NAV_ROUTES.includes(path);
  }

  private syncBottomNavbarVisibility(): void {
    setTimeout(() => {
      this._zone.run(() => {
        this.hideBottomNavbar = !this.shouldShowBottomNavbar();
      });
    });
  }

  notifications: IFormattedUserNotification[] = [];
  unreadNotificationCount = 0;

  registerToEvents() {
    let self = this;

    this.subscribeToEvent('abp.notifications.received', (userNotification: abp.notifications.IUserNotification) => {
      self._zone.run(() => {
        this.toastr.info(
          userNotification.notification.data.properties.Message,
          userNotification.notification.notificationName,
        );
      });
    });

    this.subscribeToEvent('app.notifications.refresh', () => {
      self._zone.run(() => {});
    });

    this.subscribeToEvent('app.notifications.read', (userNotificationId, success) => {
      self._zone.run(() => {});
    });
  }

  async pushNotifications() {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          PushNotifications.register();
        } else {
          // Show some error
        }
      });

      // On success, we should be able to receive notifications
      await PushNotifications.addListener('registration', (token) => {
        console.info('Registration token: ', token.value);

        Device.getId().then((deviceId) => {
          return Device.getInfo().then((deviceInfo) => {
            const device = new DeviceDto({
              deviceId: deviceId.identifier,
              model: deviceInfo.model,
              token: token.value,
            });

            this._pushNotificationService
              .deviceSave(device)
              .toPromise()
              .then(() => {
                console.log(`Device registered`);
              });
          });
        });
      });

      // Some issue with our setup and push will not work
      PushNotifications.addListener('registrationError', (error: any) => {
        // alert('Error on registration: ' + JSON.stringify(error));
      });

      // Show us the notification payload if the app is open on our device
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        // alert('Push received: ' + JSON.stringify(notification));
      });

      // Method called when tapping on a notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        // alert('Push action performed: ' + JSON.stringify(notification));
      });
    }
  }
}
