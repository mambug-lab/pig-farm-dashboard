// In-memory Sheets boundary. It intentionally does not evaluate formulas.
class FakeSheet {
  constructor(name, rows=[], formulas=[], displays=[]) { this.name=name; this.rows=rows; this.formulas=formulas; this.displays=displays; this.maxRows=Math.max(1000,rows.length); this.maxColumns=26; this.writes=[]; }
  getName(){return this.name;} getSheetId(){return 1;} getDeveloperMetadata(){return [];}
  getLastRow(){return this.rows.length;} getMaxRows(){return this.maxRows;} getMaxColumns(){return this.maxColumns;}
  insertRowsAfter(_r,n){this.maxRows+=n;} insertColumnsAfter(_c,n){this.maxColumns+=n;} hideSheet(){this.hidden=true;}
  getRange(r,c,h=1,w=1) {
    if(typeof r==='string'){const match=r.match(/^([A-Z]+)(\d+)$/);if(!match)throw new Error('Unsupported A1 '+r);c=[...match[1]].reduce((v,l)=>v*26+l.charCodeAt(0)-64,0);r=Number(match[2]);}
    const sheet=this, read=(data)=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>data[r+i-1]?.[c+j-1]??''));
    const write=(data,kind)=>{sheet.writes.push({r,c,h,w,kind});for(let i=0;i<h;i++){sheet.rows[r+i-1]??=[];sheet.formulas[r+i-1]??=[];for(let j=0;j<w;j++){if(kind==='formula'){sheet.formulas[r+i-1][c+j-1]=data[i][j];}else{sheet.rows[r+i-1][c+j-1]=data[i][j];sheet.formulas[r+i-1][c+j-1]='';}}}return range;};
    const range={getValue:()=>read(sheet.rows)[0][0],getValues:()=>read(sheet.rows),getFormulas:()=>read(sheet.formulas),getDisplayValues:()=>read(sheet.displays.length?sheet.displays:sheet.rows).map(row=>row.map(String)),setValues:data=>write(data,'value'),setFormulas:data=>write(data,'formula'),clearContent:()=>write(Array.from({length:h},()=>Array(w).fill('')),'value')};
    range.setNumberFormat=()=>range;range.setValue=value=>range.setValues([[value]]);
    return range;
  }
}
class FakeSpreadsheet {
  constructor(sheets=[]){this.sheets=sheets;}
  getSheets(){return this.sheets;} getSheetByName(name){return this.sheets.find(s=>s.name===name)||null;}
  insertSheet(name){const sheet=new FakeSheet(name);this.sheets.push(sheet);return sheet;}
}
function fromCells(snapshot){
  return new FakeSpreadsheet(snapshot.sheets.map(item=>{
    const rows=[],formulas=[],displays=[];
    for(const grid of item.data||[]) (grid.rowData||[]).forEach((row,i)=>{
      const index=(grid.startRow||0)+i; rows[index]=[];formulas[index]=[];displays[index]=[];
      for(let j=0;j<16;j++){const cell=row.values?.[j]||{};const value=cell.effectiveValue||cell.userEnteredValue||{};
        rows[index][j]=value.numberValue??value.stringValue??value.boolValue??'';
        formulas[index][j]=cell.userEnteredValue?.formulaValue||''; displays[index][j]=cell.formattedValue??String(rows[index][j]);}
    });
    const sheet=new FakeSheet(item.properties.title,rows,formulas,displays);sheet.getSheetId=()=>item.properties.sheetId;return sheet;
  }));
}
module.exports={FakeSheet,FakeSpreadsheet,fromCells};
