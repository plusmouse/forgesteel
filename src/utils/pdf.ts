import { PDFDocument, PDFForm, PDFField, PDFTextField } from 'pdf-lib';

const fileInput = document.createElement('input');
fileInput.type = 'file';
const downloader = document.createElement('a');

export class PDFExport {
  static fieldMaps = {
  }
  private lastObj: unknown

  static startExport = (obj: unknown) => {
    PDFExport.lastObj = obj
    fileInput.click()
  }
  static continueExport = async (file: unknown) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const pdfDoc = await PDFDocument.load(e.target.result)
      console.log(pdfDoc.getForm().getFields().map((a: PDFField) => a.getName()))
      const form = pdfDoc.getForm()
      for(const field of form.getFields()) {
        if(field.constructor == PDFTextField)
          field.disableRichFormatting()
      }
      const HeroLogic = (await import('../logic/hero-logic')).HeroLogic
      console.log(HeroLogic)
      const obj = PDFExport.lastObj
      const sizeData = HeroLogic.getSize(obj)
      const texts = {
        'Character Name': obj.name,
        'Ancestry': obj.ancestry.name,
        'Career Top': obj.career.name,
        'Class': obj.class.name,
        'Subclass': obj.class.subclassName,
        'Level': obj.class.level,
        'Wealth': obj.state.wealth,
        'Renown': obj.state.renown,
        'XP': obj.state.xp,
        'top speed': HeroLogic.getSpeed(obj),
        'top stability': HeroLogic.getStability(obj),
        'top size': sizeData.value + sizeData.mod,
        'Current Stamina': HeroLogic.getStamina(obj) - obj.state.staminaDamage,
        'stamina max': HeroLogic.getStamina(obj),
        'winded count': Math.floor(HeroLogic.getStamina(obj) / 2),
        'dying count': -Math.floor(HeroLogic.getStamina(obj) / 2),
        'recov stamina': HeroLogic.getRecoveryValue(obj),
        'recov max': HeroLogic.getRecoveries(obj),
        'Recoveries': HeroLogic.getRecoveries(obj) - obj.state.recoveriesUsed,
        'resource name': obj.class.heroicResource,
        'Resource Count': obj.state.heroicResource,
        'Surges': obj.state.surges,
      }
      const toggles = {}

      // Special casing because the fields weren't properly named in order
      const victoryFields = [
        'victory1',
        'victory2',
        'victory3',
        'victory4',
        'Victory 13',
        'victory5',
        'victory6',
        'victory7',
        'victory8',
        'victory9',
        'victory10',
        'victory11',
        'victory12',
        'victory14',
        'victory15'
      ]
      for(let i = 1; i <= obj.state.victories && i <= victoryFields.length; ++i) {
        toggles[victoryFields[i - 1]] = true
      }

      for(const details of obj.class.characteristics) {
        texts[details.characteristic] = details.value
      }

      for(const [key, value] of Object.entries(texts)) {
        form.getField(key).setText(value.toString())
      }
      for(const [key, value] of Object.entries(toggles)) {
        form.getField(key).check()
      }
      const data = await pdfDoc.saveAsBase64({dataUri: true})
      downloader.download = obj.name + "-character.pdf"
      downloader.href = data
      downloader.click()
    }
    reader.readAsArrayBuffer(file)
  }
}

fileInput.addEventListener('change', (event) => {
    const selectedFile = (event.target as HTMLInputElement).files[0];
    if (selectedFile) {
      PDFExport.continueExport(selectedFile)
    }
});
fileInput.click();
