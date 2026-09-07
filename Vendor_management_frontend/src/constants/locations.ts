export interface Taluka {
  name: string;
}

export interface City {
  name: string;
  talukas?: string[];
}

export interface District {
  name: string;
  cities: City[];
}

export interface State {
  name: string;
  districts: District[];
}

export const GEOGRAPHY_DATA: State[] = [
  {
    name: 'Maharashtra',
    districts: [
      {
        name: 'Mumbai City',
        cities: [
          { name: 'Mumbai', talukas: ['Colaba', 'Dharavi', 'Kurla'] }
        ]
      },
      {
        name: 'Pune',
        cities: [
          { name: 'Pune City', talukas: ['Haveli', 'Pune City'] },
          { name: 'Pimpri-Chinchwad', talukas: ['Haveli'] },
          { name: 'Baramati', talukas: ['Baramati'] }
        ]
      },
      {
        name: 'Thane',
        cities: [
          { name: 'Thane', talukas: ['Thane', 'Kalyan', 'Bhiwandi'] },
          { name: 'Kalyan-Dombivli', talukas: ['Kalyan'] },
          { name: 'Navi Mumbai', talukas: ['Thane'] }
        ]
      }
    ]
  },
  {
    name: 'Gujarat',
    districts: [
      {
        name: 'Ahmedabad',
        cities: [
          { name: 'Ahmedabad', talukas: ['Ghatlodia', 'Vectra', 'Sabarmati'] },
          { name: 'Sanand', talukas: ['Sanand'] }
        ]
      },
      {
        name: 'Surat',
        cities: [
          { name: 'Surat', talukas: ['Choryasi', 'Surat City'] },
          { name: 'Bardoli', talukas: ['Bardoli'] }
        ]
      }
    ]
  },
  {
    name: 'Karnataka',
    districts: [
      {
        name: 'Bengaluru Urban',
        cities: [
          { name: 'Bengaluru', talukas: ['Bengaluru North', 'Bengaluru South', 'Bengaluru East'] }
        ]
      },
      {
        name: 'Mysuru',
        cities: [
          { name: 'Mysuru', talukas: ['Mysuru', 'Nanjangud'] }
        ]
      }
    ]
  },
  {
    name: 'Delhi',
    districts: [
      {
        name: 'New Delhi',
        cities: [
          { name: 'New Delhi', talukas: ['Chanakyapuri', 'Connaught Place'] }
        ]
      },
      {
        name: 'South Delhi',
        cities: [
          { name: 'Saket', talukas: ['Hauz Khas', 'Mehrauli'] }
        ]
      }
    ]
  }
];
