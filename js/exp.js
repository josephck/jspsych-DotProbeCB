//Data
const correct_anskey = {'left':37, 'right':39}
const feedback_msg = {'Correct':'Correct, well done!','Wrong': 'Oops! That was wrong, try again!'}


const block_para_lists = [{
    instruction: "<p>blah blah blah</p>",
    stim_csv: "wordlist_p1.csv",
    debrief: "<p>blah blah blah</p>",
    feedback:true,
    preprocess:assignTrialCondandShuffle
  },
  {
    instruction: "<p>blah blah blah</p>",
    stim_csv: "wordlist_p2.csv",
    debrief: "<p>blah blah blah</p>",
    feedback:true,
    preprocess:assignTrialCondandShuffle
  },
  {
    instruction: "<p>blah blah blah</p>",
    stim_csv: "wordlist_exp.csv",
    debrief: "<p>blah blah blah</p>",
    feedback:false,
    preprocess:assignTrialCondandShuffle
  }
];

const fixation = {
  type: 'html-keyboard-response',
  stimulus: '<p class="stimulus">+</p>',
  choices: jsPsych.NO_KEYS,
  trial_duration: 1000,
  post_trial_gap: 0
}

const instruction_text = '<p>Blah Blah Blah</p>'+
    '<p>Blah Blah Blah Blah</p>';


const debrief_text ="<p>blah blah blah DONE</p>";

//Functions
function assignTrialCondandShuffle(stim_list) {
  //Pre: list of stim in format {'threat': 'word1','neutral':'word2'}
  //post: list of stim in format {'threat','neutral','threatup','probeup','probedir'}
  // counterbalance threatup, probeup, probedir
  // 2^3 combinations in total all should have equal no. of trials
  var factors = {
    'threatup':[true,false],
    'probeup':[true,false],
    'probedir':['left','right']
  }
  
  full_design = jsPsych.randomization.factorial(factors,stim_list.length/8)

  for (i=0;i<stim_list.length;i++) {
    stim_list[i]['threatup'] = full_design[i]['threatup']
    stim_list[i]['probeup' ] = full_design[i]['probeup' ]
    stim_list[i]['probedir'] = full_design[i]['probedir']
  }


  return jsPsych.randomization.repeat(stim_list,1);
}


function buildInstruction(text) {
  return  {
    type: 'html-keyboard-response', 
    //please refine the instruction below, use <p> and </p> to surround every line"
    stimulus: text +
      '<p>When you are ready to begin, press Y or N.</p>',
    choices: ['y','n']
  }
}

function buildDebrief(text) {
  return {
    type: 'html-keyboard-response',
    stimulus: "<p>blah blah blah DONE</p>" ,
    prompt: "<p>press any key to take a look on the data</p>" 
  }
}
//Promisify
function readAndBuildBlock(block_para) {
  return new Promise(function(resolve, reject){
    Papa.parse(csv_path + block_para.stim_csv,{
      download : true,
      header : true,
  skipEmptyLines: true,
      complete: function(results){
    resolve(buildBlock(block_para, results.data));
      }
    });
  });
}

function buildBlock(block_para, results) {
  function buildSimpleBlock(block_para,results) {
    return {timeline:[buildInstruction(block_para.instruction),
             trials(results,block_para.feedback),
      buildDebrief(block_para.debrief)]
      }
  }
    var block;
    if (typeof block_para.preprocess === "undefined") {
      return buildSimpleBlock(block_para,results);
    } else {
      stimdata = block_para.preprocess(results);
      var timeline = [];
      timeline.push(buildSimpleBlock(block_para,stimdata));
  return {'timeline':timeline} ;
    }
    
}

function trials(stimuli, feedback  = false) {
    result = {
      timeline_variables: stimuli,
      randomize_order: true,
      timeline: [
        fixation,
        {
          type: 'html-keyboard-response',
          stimulus: function(){var threatup = jsPsych.timelineVariable('threatup',true); 
          return `<div class='${threatup?'upstim':'downstim'}'><p>${jsPsych.timelineVariable('threat',true)}</p></div>` + 
          `<div class='${threatup?'downstim':'upstim'}'><p>${jsPsych.timelineVariable('neutral',true)}</p></div>` 
          ; },
          choices: jsPsych.NO_KEYS,
          trial_duration: 500,
        },
        {
          type: 'html-keyboard-response',
          stimulus: function(){return `<div class='${jsPsych.timelineVariable('probeup',true)?'upstim':'downstim'}'><p>
          ${(jsPsych.timelineVariable('probedir',true)=='left')?'<':'>'}</p></div>`;},           
          choices: [37,39],
          trial_duration: 10000,
          data: function(){
            return {
                pair_id: jsPsych.timelineVariable('pairId',true),
                word_threat: jsPsych.timelineVariable('threat',true),
                word_neutral: jsPsych.timelineVariable('neutral',true),
                threatup: jsPsych.timelineVariable('threatup',true),
                probeup: jsPsych.timelineVariable('probeup',true),
                probedir: jsPsych.timelineVariable('probedir',true) 
            }
          },
          on_finish: function(data){
              if (data.key_press == correct_anskey[jsPsych.timelineVariable('probedir',true)]) {
                  data.correct = true; 
              } else {
                  data.correct = false;
              }
          }
        }
      ]
    }
    if (feedback) {
      result.timeline.push({
        
        type: 'html-keyboard-response',
          stimulus: function(){ return `<p class='feedback'>${(jsPsych.data.getLastTrialData().values()[0].correct?feedback_msg['Correct']:feedback_msg['Wrong'])}</p>`; },
          trial_duration: 2000
      })
    }
    return result;
}

//Enviornment constant and variables
const csv_path = "./csv/";
let promises = [];
var timeline = [];



//main()
for (const block_para of block_para_lists) {
  promises.push(readAndBuildBlock(block_para));
}



Promise.all(promises).then(function(){
  timeline.push(buildInstruction(instruction_text));
  for(const block of arguments[0]) {
    timeline.push(block);
  }
  timeline.push(buildDebrief(debrief_text));
  jsPsych.init({
    timeline: timeline,
    on_finish: function() {
        jsPsych.data.displayData();
    },
    default_iti: 0
  });

})
