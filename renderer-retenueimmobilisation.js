const { ipcRenderer, remote } = require('electron');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const winston = require("winston");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Ajout de la date
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "log/log-tvaEtrangere.log" }),
  ],
});
function cleanText(text) {
    return text.replace(/[^\w\s]/gi, '');
}
function formatDate(dateStr) {
    // On suppose que la date est dans le format "dd/MM/yyyy"
    const [day, month, year] = dateStr.split('/');

    // Créer un objet Date en utilisant les valeurs extraites
    const date = new Date(year, month - 1, day); // Les mois commencent à 0 dans l'objet Date

    // Formater la date dans le format "yyyy-MM-dd"
    const formattedDate = date.toISOString().split('T')[0];

    return formattedDate;
}
function retRefEtatAcquisitionMateriel(mode) {
    const modeMapping = {
        'NEUF': 'NEUF_1',
        'OCCASIONNEL': 'OCCASION_2'
    };
    return modeMapping[mode] || '';  
}
function retrefNatureRetrait(mode) {
    const modeMapping = {
        'RETRAIT': 'RETRAIT_1',
        'CESSION': 'CESSION_2'
    };
    return modeMapping[mode] || 'RESIL_BAIL_2';  
}
function refstatutsTerrains(mode) {
    const modeMapping = {
        'LOCATION': 'LOCATION_2',
        'LEASING': 'LEASING_3'
    };
    return modeMapping[mode] || 'PROPRIETE_1';  
}
function retRefMateriel(mode) {
    //alert(mode);
    const modeMapping = {
        'Constructions': 'CONSTRUCT_2',   
        'Agencements': 'AGENCEMENT_3',   
        'Aménagements': 'AMENAGEMENT_4',
        'Matériel et outillage': 'MAT_OUTIL_5',
        'Matériel roulant autre que matériel de transport':'TRANSPORT_6',
        'Mobilier, matériel de bureau et aménagement divers':'MOBILIER_7'
    };
    return modeMapping[mode] || 'TERRAIN_1';  
}
function codenatacquisitionterrains(mode) {
    const modeMapping = {
        'Terrains': 'TERRAIN_1',   
        'Constructions': 'CONSTRUCT_2',   
        'Agencements': 'AGENCEMENT_3',   
        'Aménagements': 'AMENAGEMENT_4'
    };
    return modeMapping[mode] || '';  
}
function refstatutsMateriel(mode) {
    const modeMapping = {
        'LOCATION': 'LOCATION_2',
        'leasiLEASING': 'LEASING_3',
    };
    return modeMapping[mode] || 'PROPRIETE_1';
}
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
    fs.readFile(filePath, "latin1", (err, data) => {
        if (err) {
            alert("❌ Erreur de lecture du fichier CSV :", err);
            return;
        }
        const lines = data.split("\n").map(line => line.trim()).filter(line => line !== "");
        let generalData = {};
        let terrains = [];
        let materiels = [];
        let retraits=[];
        lines.forEach(line => {
            const parts = line.split(";").map(part => part.trim());
            if (parts[0] === "E") {
                try{
                generalData = {
                    identifiantFiscal: parts[1],
                    exerciceFiscalDu: parts[2],
                    exerciceFiscalAu: parts[3],
                    annee: parts[4],
                    numTPLocaleDec: parts[5],
                    numTSCLocaleDec: parts[6],
                    adressLocaleDec: cleanText(parts[7]),
                };
            } catch (error) {
                logger.error(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                alert(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                return;
              }
            } else if (parts[0] === "T") {
                try{
                terrains.push({
                    refNatureAcquision: codenatacquisitionterrains(parts[1].trim()), // Nettoyage du texte
                    estImmatricule: '1',
                    numTSC: (parts[2].trim()), // Nettoyage du texte
                    numTF: (parts[3].trim()), // Nettoyage du texte
                    consistance: cleanText(parts[4].trim()), // Nettoyage du texte
                    superficie: (parts[5].trim()), // Nettoyage du text
                    refStatutPatrimonial: refstatutsTerrains(parts[6].trim().toUpperCase()), // Conversion en nombre
                    prixAcquision: parseFloat(parts[7].trim().replace(",", ".")), // Conversion en nombre
                    dateAcquisition: (parts[8].trim()), // Nettoyage du texte
                });
            } catch (error) {
                logger.error(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                alert(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                return;
              }
            }else if (parts[0] === "M") {
                try{
                materiels.push({ refDesignationMat : retRefMateriel(parts[1].trim()),
                refEtatAcquision:retRefEtatAcquisitionMateriel(parts[2].trim().toUpperCase()),
                refStatutPatrimonial:refstatutsMateriel(parts[3].trim().toUpperCase()) ,
                dateAcquisition:    (parts[4].trim()),
                dateMiseEnService:  (parts[5].trim()),
                prixAcquisition:parseFloat(parts[6].trim().replace(",", "."))
            });
        } catch (error) {
            logger.error(
              `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
            );
            alert(
              `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
            );
            return;
          }
            }else if (parts[0] === "R") {
                try{
                retraits.push({  designationRetrait: retRefMateriel(parts[1].trim()),
                    natureOperationRetrait:retrefNatureRetrait(parts[2].trim().toUpperCase()),
                    numTSC:  (parts[3].trim()),
                    numTF:  (parts[4].trim()),
                    prixAcquisition:  parseFloat(parts[5].trim().replace(",", ".")),
                    prixCession:  parseFloat(parts[6].trim().replace(",", ".")),
                    dateAcquisition:  (parts[7].trim()),
                    dateRetrait:  (parts[8].trim())
                });
            } catch (error) {
                logger.error(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                alert(
                  `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
                );
                return;
              }
            }
        });
   //   alert(retraits);
        callback({ generalData, terrains, materiels,retraits });
    });

}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
     
    const { generalData, terrains,materiels,retraits } = data;
    const namespaces = {
        xsi: 'http://www.w3.org/2001/XMLSchema-instance',
    };
    const xmlData = {
        DecElementImposable: {
            $: {
                'xmlns:xsi': namespaces.xsi,
                'xsi:noNamespaceSchemaLocation': 'DecChomage.xsd',
            },
            identifiantFiscal: generalData.identifiantFiscal,
            exerciceFiscalDu: generalData.exerciceFiscalDu,
            exerciceFiscalAu: generalData.exerciceFiscalAu,
            annee: generalData.annee,
            numTPLocaleDec: generalData.numTPLocaleDec,
            numTSCLocaleDec: generalData.numTSCLocaleDec,
            adressLocaleDec: generalData.adressLocaleDec,
        }
    };
    if (terrains.length > 0) {
        xmlData.DecElementImposable.listAcquisitionOuLocationTerrain = {
            AcquisitionOuLocationTerrain: terrains.map(v => ({
                refNatureAcquision: { code: v.refNatureAcquision },
                estImmatricule: v.estImmatricule,
                numTSC: v.numTSC,
                numTF: v.numTF,
                superficie: v.superficie,
                consistance: v.consistance,
                refStatutPatrimonial: { code: v.refStatutPatrimonial },
                prixAcquision: v.prixAcquision.toFixed(2),
                dateAcquisition: v.dateAcquisition,
            }))
        };
    }
    if (materiels.length > 0) {
        xmlData.DecElementImposable.listAcquisitionOuLocationMateriel = {
            AcquisitionOuLocationMateriel: materiels.map(v => ({
                refDesignationMat: { code: v.refDesignationMat },
                refEtatAcquision: { code: v.refEtatAcquision },
                refStatutPatrimonial: { code: v.refStatutPatrimonial },
                dateAcquisition: v.dateAcquisition,
                dateMiseEnService: v.dateMiseEnService,
                prixAcquisition: v.prixAcquisition.toFixed(2)
            }))
        };
    }
    if (retraits.length > 0) {
        xmlData.DecElementImposable.listRetraits = {
            Retraits: retraits.map(v => ({
                designationRetrait: { code: v.designationRetrait },
                natureOperationRetrait: { code: v.natureOperationRetrait },
                numTSC: v.numTSC,
                numTF: v.numTF,
                prixAcquisition: v.prixAcquisition.toFixed(2),
                prixCession:v.prixCession.toFixed(2),
                dateAcquisition:v.dateAcquisition,
                    dateRetrait:v.dateRetrait
            }))
        };
    }
    const builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });
    const xmlContent = builder.buildObject(xmlData);
    const uuid = crypto.randomUUID();
    const fileName = `Immobilisations_${uuid}.xml`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFile(filePath, xmlContent, (err) => {
        if (err) {
            alert("❌ Erreur lors de la génération du fichier XML :", err);
        } else {
            alert(`✅ Fichier XML généré avec succès : ${filePath}`);
        }
    });
}
// Écouter l'événement 'file-opened' envoyé depuis main.js
document.getElementById('convertButtonType1').addEventListener('click', () => {
    ipcRenderer.on('file-opened', (event, filePath) => {
        alert('Fichier ouvert: ' + filePath);  // Afficher une alerte pour confirmer que le fichier a été ouvert
        readCSV(filePath, (data) => {
            const outputDir = path.dirname(filePath);
            generateXML(data, outputDir);
        });
    });
    // console.log('Convert button clicked'); // Log pour débogage
    const fileInput = document.getElementById('fileInputType1');
    if (fileInput.files.length === 0) {
        alert('Please select a CSV file first.');
        return;
    }
    const file = fileInput.files[0];
    if (!file) {
        alert('No file selected');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const csvData = e.target.result;
        // const filetrt = __dirname + '/indeclarations/' + file.name;
        const filetrt = 'd:/dectva/in/' + file.name;
       // alert('Fichier ouvert: ' + filetrt);
        // Passer les données CSV lues pour traitement
        readCSV(filetrt, (data) => {
            //  const outputDir = __dirname + '/outdeclarations/';
            const outputDir = 'd:/dectva/out/';
            generateXML(data, outputDir);
        });
    };
    reader.readAsText(file);
});
