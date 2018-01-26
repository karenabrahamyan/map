import {Component, NgZone} from '@angular/core';
import {NavController, Platform} from 'ionic-angular';
import {
  GoogleMaps,
  GoogleMap,
  GoogleMapOptions,
  Spherical,
  GoogleMapsEvent,
  MarkerOptions,
  Marker
} from '@ionic-native/google-maps';
import {RequestPipe} from "../../pipes/request/request";
import {ListPage} from "../list/list";

declare var google: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  map: GoogleMap;
  markers = [];
  my_loc: any;
  selected_button = '';
  is_down: boolean = true;
  filter_atm_set: boolean = false;
  filter_branch_set: boolean = false;
  filter_partner_set: boolean = false;
  public text_distance: String;
  public selected_object: any;

  constructor(public navCtrl: NavController, public platform: Platform, private updateZone: NgZone, private requestFidem: RequestPipe) {
    if (this.platform.is("cordova")) {
      if(this.platform.ready()){
        this.loadMap();
      }
    }
  }
  loadMap() {
    if (this.platform.is("cordova")) {
      let mapOptions: GoogleMapOptions = {
        controls: {
          compass: false,
          myLocationButton: true,
          indoorPicker: false,
          mapToolbar: false
        },
        camera: {
          target: {
            lat: 40.1817318,
            lng: 44.5122556
          },
          zoom: 8
        },
        styles: [{
          stylers: [{
            saturation: -100
          }]
        }]/*,
        preferences: {
          padding: {top: this.platform.height() * 20 / 100}
        }*/
      };
      if (!this.map) {
        this.map = GoogleMaps.create('map', mapOptions);
      }
      if (this.map) {
        this.map.one(GoogleMapsEvent.MAP_READY)
          .then((map) => {
            console.log('map ready');
            this.map.getMyLocation().then(loc => {
              this.updateZone.run(() => {
                this.my_loc = loc;
              });
              this.draw_markers(loc, null);
            }).catch(error => {
              console.log('Error getting location' + JSON.stringify(error));
              let loc = {
                "latLng": {
                  "lat": "40.2007675",
                  "lng": "44.475342"
                }
              };
              this.my_loc = loc;
              this.draw_markers(loc, null);
            });
          }).catch(error => {
          console.log('Error getting location' + JSON.stringify(error));
        });
      }

    }
  }

  draw_markers(loc, markers) {
    let farest = null;
    this.requestFidem.getNearByLocations(loc.latLng, "en").subscribe(data => {
      if (data.length) {
        this.markers = data;
        farest = this.draw_circle_near_loc(this.markers, loc);
        this.set_markers(this.markers);

        let locations_zoom = [{
          lat: this.my_loc.latLng.lat,
          lng: this.my_loc.latLng.lng
        }, farest];
        for (let k = 0; k < data.length; k++) {
          locations_zoom.push(data[k].latLng);
        }
        this.set_self_location(true, locations_zoom);
      }

    });
    return farest;
  }

  draw_circle_near_loc(temp_obj, loc) {
    if (this.platform.is("cordova")) {
      let max = 0.0;
      let farest = null;
      for (let key = 0; key < temp_obj.length; key++) {
        let calc_dist = Spherical.computeDistanceBetween(loc.latLng, temp_obj[key].latLng);
        if (calc_dist > max) {
          max = calc_dist;
          farest = temp_obj[key].latLng;
        }
      }
      //let bounds = new this.googleMaps.LatLngBounds();
      this.map.addCircle({
        'center': loc.latLng,
        'radius': max,
        'strokeColor': 'rgba(8,215,203,0.3)',
        'strokeWidth': 1,
        'fillColor': 'rgba(8,215,203,0.3)'
      }).then(success => {

      });
      return farest;
    }
    return false;
  }

  set_markers(arr = []) {
    if (this.platform.is("cordova")) {
      this.map.one('map_ready')
        .then(() => {
        }).catch(error => {
        console.log('Error: ' + JSON.stringify(error));
      });
      let locations_zoom = [{
        lat: this.my_loc.latLng.lat,
        lng: this.my_loc.latLng.lng
      }];
      if (arr.length) {
        for (let n in arr) {
          if(arr[n].type != 'branch'){
            continue;
          }
          locations_zoom.push(arr[n].latLng);
          let view_marker = (arr[n].type == 'partner' || arr[n].type == 'atm') ? {
            icon: arr[n].icon,
            animation: arr[n].animation,
            position: {
              lat: parseFloat(arr[n].latLng.lat),
              lng: parseFloat(arr[n].latLng.lng)
            }
          } : {
            title: arr[n].title,
            icon: arr[n].icon,
            animation: arr[n].animation,
            position: {
              lat: parseFloat(arr[n].latLng.lat),
              lng: parseFloat(arr[n].latLng.lng)
            }
          };
          if (!this.map) {
            continue;
          }
          this.map.addMarker(view_marker).then((marker) => {

            marker.on('marker_click')
              .subscribe((m) => {
                this.updateZone.run(() => {
                  if (arr[n].type != 'atm') {
                    this.navCtrl.setRoot(ListPage, {
                      target: arr[n],
                      button: this.selected_button
                    });
                  } else if (arr[n].type == 'atm') {
                    this.is_down = false;
                    this.filter_branch_set = false;
                    this.filter_partner_set = false;
                    if (!this.filter_atm_set) {
                      this.updateZone.run(() => {
                        this.filter_atm_set = true;
                      });
                    }
                    this.remove_markers('atm');
                    this.selected_object = null;
                    this.selected_object = arr[n];
                    this.calculateAndDisplayRoute(this.my_loc, arr[n]);
                  }

                });


              });
          }).catch(error => {
            console.log('Error: ' + JSON.stringify(error));
          });

        }
        this.set_self_location(true, locations_zoom);
      } else {
        console.log('empty array');
      }
    }
  }

  remove_markers(type = "branch", reverse = false) {
    if (this.markers.length) {
      this.map.clear().then(sucess => {
        this.set_self_location();
        let temp_markers = [];
        for (let key = 0; key < this.markers.length; key++) {
          if (this.markers[key].type == type && !reverse) {
            temp_markers.push(this.markers[key]);
          }
          if (this.markers[key].type != type && reverse) {
            temp_markers.push(this.markers[key]);
          }
        }
        //  alert('2');
        this.set_markers(temp_markers);
      });

    }
  }

  set_self_location(zoom = true, bounds = null) {
    let loc = this.my_loc;
    this.map.addMarker({
      icon: 'http://araratbank.first.am/public/images/mylocation.png',
      animation: 'DROP',
      position: {
        lat: loc.latLng.lat,
        lng: loc.latLng.lng
      }
    }).then((marker) => {

      if (zoom) {
        this.map.moveCamera({
          target: (bounds) ? bounds : {
            lat: loc.latLng.lat,
            lng: loc.latLng.lng
          },
          zoom: 15
        });
      }
    });
  }

  calculateAndDisplayRoute(org, dest) {
    if (!this.map) {
      return false;
    }
    let directionsService = new google.maps.DirectionsService;
    directionsService.route({
      origin: org.latLng.lat + "," + org.latLng.lng,
      destination: dest.latLng.lat + "," + dest.latLng.lng,
      travelMode: 'WALKING'
    }, (response, status) => {

      if (status === 'OK') {
        this.updateZone.run(() => {
          this.text_distance = response.routes[0].legs[0].distance.text;
        });
        let points_parse = [];
        for (let p = 0; p < response.routes[0].overview_path.length; p++) {
          let jp = JSON.parse(JSON.stringify(response.routes[0].overview_path[p]));
          points_parse.push({"lat": jp.lat, "lng": parseFloat(jp.lng)});
        }
        this.map.addPolyline({
          "points": points_parse,
          "color": '#2acd47',
          "width": 6,
          "geodesic": true
        }).then((s) => {
          console.log(JSON.stringify(s));
        }).catch(err => {
          console.log(JSON.stringify(err));
        });
      } else {
        alert('Directions request failed due to ' + status);
      }

    });
  }
}
