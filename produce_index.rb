require 'rubygems'
require 'haml'
require 'json'

data = JSON.parse(File.read('dq10skill-data.json'))
asin_list = File.readlines('asin_list.txt').map { |e| e.chomp }
#skillCategories = data['skillCategories']
#data['vocationOrder'].each do |vocation|
#  puts vocation
#  puts data['vocations'][vocation]['skills'].join
#end
puts Haml::Engine.new(File.read('index.haml')).render(Object.new, {:data => data, :asin_list => asin_list})
