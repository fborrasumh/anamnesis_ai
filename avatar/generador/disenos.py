# 8 pacientes: 4 edades x 2 sexos. Recursos MakeHuman (CC0).
def edad(y):  # años -> valor MakeHuman
    return 0.5 + (y - 25) / 130 if y >= 25 else 0.1875 + (y - 11) / 14 * 0.3125
D = [
 # id,            sexo, años, piel,                          pelo,        color pelo,          ropa,                  cejas,       pestañas,     peso, músculo
 ('mujer_25',     0.0, 25, 'young_caucasian_female',      'ponytail01', 'natural_brown',      'female_casualsuit02', 'eyebrow010', 'eyelashes02', 0.45, 0.45),
 ('hombre_25',    1.0, 25, 'young_caucasian_male',        'short02',    'dark_chocolate_brown','male_casualsuit01',  'eyebrow001', 'eyelashes01', 0.50, 0.55),
 ('mujer_40',     0.0, 40, 'middleage_caucasian_female',  'long01',     'dark_auburn',        'female_casualsuit01', 'eyebrow006', 'eyelashes02', 0.55, 0.45),
 ('hombre_40',    1.0, 40, 'middleage_caucasian_male',    'short04',    'off_black',          'male_casualsuit03',   'eyebrow002', 'eyelashes01', 0.60, 0.50),
 ('mujer_58',     0.0, 58, 'middleage_caucasian_female',  'braid01',    'dark_brown_70_grey', 'female_elegantsuit01','eyebrow007', 'eyelashes03', 0.62, 0.40),
 ('hombre_58',    1.0, 58, 'old_caucasian_male',          'short02',    'off_black_50_grey',  'male_casualsuit05',   'eyebrow003', 'eyelashes01', 0.65, 0.45),
 ('mujer_75',     0.0, 75, 'old_caucasian_female',        'short04',    'white',              'female_casualsuit01', 'eyebrow008', 'eyelashes04', 0.58, 0.35),
 ('hombre_75',    1.0, 75, 'old_caucasian_male',          'short04',    'white',              'male_casualsuit04',   'eyebrow004', 'eyelashes01', 0.55, 0.35),
]
