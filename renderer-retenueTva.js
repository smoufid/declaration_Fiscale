const { ipcRenderer, remote } = require('electron');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const config = require('./config.json');
// Fonction pour nettoyer le texte
function cleanText(text) {
    return text.replace(/[^\w\s]/gi, '');
}

// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
    // alert(__dirname);
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            alert("❌ Erreur de lecture du fichier CSV :", err);
            return;
        }
        const lines = data.split("\n").map(line => line.trim()).filter(line => line !== "");
        let generalData = {};
        let versements = [];
        lines.forEach(line => {
            const parts = line.split(";").map(part => part.trim());
            if (parts[0] === "E") {
                generalData = {
                    identifiantFiscal: parts[1],
                    exerciceFiscalDu: parts[2],
                    exerciceFiscalAu: parts[3],
                    moisVers: parts[4]
                };
            } else if (parts[0] === "D") {
                let tauxRetenueSource = parseInt(parts[4], 10);
                if (tauxRetenueSource === 5) {
                    tauxRetenueSource = 229;
                } else if (tauxRetenueSource === 10) {
                    tauxRetenueSource = 230;
                } else {
                    tauxRetenueSource = 231;
                }
                versements.push({
                    identifiantFiscalDRVT: parts[1],
                    iceDRVT: parts[2],
                    raisonSocialeDRVT: cleanText(parts[3]),
                    tauxRetenueSource: tauxRetenueSource,
                    dateVersement: parts[5],
                    montantRemunSoumise: parseFloat(parts[6].replace(",", ".")),
                    montantRetenueSource: parseFloat(parts[7].replace(",", "."))
                });
            }
        });

        callback({ generalData, versements });
    });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
    const { generalData, versements } = data;

    const xmlData = {
        versDRVT: {
            identifiantFiscal: generalData.identifiantFiscal,
            exerciceFiscalDu: generalData.exerciceFiscalDu,
            exerciceFiscalAu: generalData.exerciceFiscalAu,
            moisVers: generalData.moisVers,
            detailsVersDRVT: {
                DetailVersDRVT: versements.map(v => ({
                    identifiantFiscalDRVT: v.identifiantFiscalDRVT,
                    iceDRVT: v.iceDRVT,
                    raisonSocialeDRVT: v.raisonSocialeDRVT,
                    dateVersement: v.dateVersement,
                    montantRemunSoumise: v.montantRemunSoumise.toFixed(2),
                    tauxRetenueSource: v.tauxRetenueSource,
                    montantRetenueSource: v.montantRetenueSource.toFixed(2)
                }))
            }
        }
    };
    const builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });
    const xmlContent = builder.buildObject(xmlData);
    const uuid = crypto.randomUUID();
    const fileName = `RS_FINALE_${uuid}.xml`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFile(filePath, xmlContent, (err) => {
        if (err) {
            alert("❌ Erreur lors de la génération du fichier XML :", err);
        } else {
            alert(`✅ Fichier XML généré avec succès : ${filePath}`);
        }
    });
}

document.getElementById('convertButtonType1').addEventListener('click', () => {
    ipcRenderer.on('file-opened', (event, filePath) => {
        alert('Fichier ouvert: ' + filePath);  // Afficher une alerte pour confirmer que le fichier a été ouvert
        readCSV(filePath, (data) => {
            const outputDir = path.dirname(filePath);
            generateXML(data, outputDir);
        });
    });
    //  console.log('Convert button clicked'); // Log pour débogage
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
        const filetrt ='d:/dectva/in/'  + file.name;
        readCSV(filetrt, (data) => {
         //   const outputDir = __dirname + '/outdeclarations/';
            const outputDir = 'd:/dectva/out/';
            generateXML(data, outputDir);
        });
    };
    reader.readAsText(file);
});